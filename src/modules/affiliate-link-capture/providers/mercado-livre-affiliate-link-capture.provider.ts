import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Locator, Page } from 'playwright';

import {
  BrowserSessionNotConfiguredError,
  BrowserSessionStateError,
  PlaywrightService,
} from '../../../infra/browser';
import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';
import { Marketplace } from '../../../shared/enums/marketplace.enum';
import { extractMercadoLivreExternalId } from '../../marketplaces/providers/mercado-livre/mercado-livre-product-parser.utils';
import { AffiliateLinkCaptureManualRequiredError } from '../errors/affiliate-link-capture-manual-required.error';
import {
  AffiliateLinkCaptureProvider,
  CaptureAffiliateLinkInput,
  CapturedAffiliateLink,
} from './affiliate-link-capture-provider.interface';

const DEFAULT_CAPTURE_TIMEOUT_MS = 5_000;
const POPUP_CAPTURE_TIMEOUT_MS = 1_000;
const CASHBACK_MODAL_TIMEOUT_MS = 1_500;
const PAGE_TEXT_SNIPPET_LENGTH = 500;
const SCREENSHOT_REASON_MAX_LENGTH = 80;

const CAPTCHA_SELECTOR = [
  'iframe[src*="captcha" i]',
  '[data-testid*="captcha" i]',
  'input[name*="captcha" i]',
  'body:has-text("Não sou um robô")',
  'body:has-text("Nao sou um robo")',
  'body:has-text("captcha")',
].join(', ');

const SESSION_INVALID_SELECTOR = [
  '[data-testid="login-form"]',
  'input[name="user_id"]',
  'input[name="password"]',
  'form[action*="login" i]',
  'body:has-text("Digite seu e-mail ou telefone")',
  'body:has-text("iniciar sessão")',
  'body:has-text("Entre na sua conta")',
].join(', ');

const CASHBACK_ACKNOWLEDGEMENT_SELECTOR = [
  '[role="dialog"] button:has-text("Entendi")',
  '.andes-modal button:has-text("Entendi")',
  'button:has-text("Entendi")',
].join(', ');

const AFFILIATE_ACTION_SELECTORS = [
  'nav[aria-label="Afiliados"] [data-testid="generate_link_button"]',
  'nav[aria-label="Afiliados"] button.generate_link_button',
  'nav[aria-label="Afiliados"] button:has-text("Compartilhar")',
  'nav[aria-label="Afiliados"] [data-testid*="affiliate" i] button',
  'button[aria-label*="link de afiliado" i]',
  'button:has-text("Gerar link")',
  'a:has-text("Gerar link")',
  'button:has-text("Link de afiliado")',
];

const AFFILIATE_URL_SELECTOR = [
  '[data-testid="text-field__label_link"]',
  '[data-testid*="affiliate-link" i] input',
  '[data-testid*="affiliate-link" i] textarea',
  '[data-testid*="affiliate-link" i][href^="http"]',
  'input[aria-label*="link de afiliado" i]',
  'textarea[aria-label*="link de afiliado" i]',
  'input[readonly][value^="http"]',
].join(', ');

const PRODUCT_ID_MODE_SELECTOR = [
  '[data-testid*="generate" i]:has-text("ID de produto")',
  'button:has-text("Gerar link / ID de produto")',
  'a:has-text("Gerar link / ID de produto")',
  'text="Gerar link / ID de produto"',
].join(', ');

const PRODUCT_ID_INPUT_SELECTOR = [
  '[data-testid="text-field__label_id"]',
  '[data-testid*="field" i][data-testid*="id" i] input',
  'input[name*="id" i]',
  'input[aria-label*="id" i]',
  'input[placeholder*="id" i]',
].join(', ');

const SUGGESTED_TEXT_SELECTOR =
  '[data-testid="text-field__label_suggested_text"]';

@Injectable()
export class MercadoLivreAffiliateLinkCaptureProvider implements AffiliateLinkCaptureProvider {
  readonly marketplaces = [Marketplace.MercadoLivre] as const;
  private readonly logger = new Logger(
    MercadoLivreAffiliateLinkCaptureProvider.name,
  );

  constructor(
    private readonly playwrightService: PlaywrightService,
    private readonly configService: ConfigService,
  ) {}

  async captureAffiliateLink(
    input: CaptureAffiliateLinkInput,
  ): Promise<CapturedAffiliateLink> {
    let session: Awaited<
      ReturnType<PlaywrightService['openAuthenticatedPage']>
    >;

    try {
      this.logger.log(
        `Starting Mercado Livre affiliate link capture for product ${input.productId}`,
      );
      session = await this.playwrightService.openAuthenticatedPage(
        Marketplace.MercadoLivre,
        input.originalProductUrl,
      );
      this.logger.log(
        `Mercado Livre product page opened. Current URL: ${session.page.url()}`,
      );
    } catch (error) {
      if (
        error instanceof BrowserSessionNotConfiguredError ||
        error instanceof BrowserSessionStateError
      ) {
        throw new AffiliateLinkCaptureManualRequiredError(
          error.message,
          AutomationErrorType.SessionInvalid,
        );
      }

      throw error;
    }

    try {
      await this.assertPageCanCapture(session.page);
      this.logger.debug('Mercado Livre product page passed initial guards');
      await this.dismissCashbackModalIfPresent(session.page);

      const action = await this.findAffiliateActionLocator(session.page);

      if (!action) {
        await this.logPageSnapshot(
          session.page,
          'affiliate action not found on product page',
          input.productId,
        );
        throw this.layoutChanged(
          'Mercado Livre affiliate link action was not found',
        );
      }

      this.logger.log('Mercado Livre affiliate action found; clicking it');
      let generatedPagePromise = this.waitForGeneratedPage(session.page);
      await action.click();
      this.logger.debug(
        `Mercado Livre affiliate action clicked. Current URL: ${session.page.url()}`,
      );
      const cashbackModalDismissed = await this.dismissCashbackModalIfPresent(
        session.page,
      );

      if (cashbackModalDismissed) {
        this.logger.log(
          'Mercado Livre cashback modal was dismissed after affiliate action; clicking affiliate action again',
        );
        const actionAfterModal = await this.findAffiliateActionLocator(
          session.page,
        );

        if (!actionAfterModal) {
          await this.logPageSnapshot(
            session.page,
            'affiliate action not found after cashback modal dismissal',
            input.productId,
          );
          throw this.layoutChanged(
            'Mercado Livre affiliate link action was not found after cashback modal dismissal',
          );
        }

        generatedPagePromise = this.waitForGeneratedPage(session.page);
        await actionAfterModal.click();
        this.logger.debug(
          `Mercado Livre affiliate action clicked after cashback modal dismissal. Current URL: ${session.page.url()}`,
        );
      }

      await this.assertPageCanCapture(session.page);

      let output = await this.waitForVisibleLocator(
        session.page,
        AFFILIATE_URL_SELECTOR,
      );
      this.logger.debug(
        `Mercado Livre generated link output on original page: ${output ? 'found' : 'not found'}`,
      );
      const generatedPage = output ? null : await generatedPagePromise;
      const capturePage =
        output || !generatedPage ? session.page : generatedPage;

      if (generatedPage) {
        this.logger.log(
          `Mercado Livre generated link flow opened a new page. URL: ${generatedPage.url()}`,
        );
        await this.assertPageCanCapture(generatedPage);
        output = await this.waitForVisibleLocator(
          generatedPage,
          AFFILIATE_URL_SELECTOR,
        );
        this.logger.debug(
          `Mercado Livre generated link output on new page: ${output ? 'found' : 'not found'}`,
        );
      }

      if (!output) {
        this.logger.warn(
          'Mercado Livre generated link output not found; trying product ID fallback',
        );
        await this.tryGenerateByProductId(
          capturePage,
          input.originalProductUrl,
        );
        output = await this.waitForVisibleLocator(
          capturePage,
          AFFILIATE_URL_SELECTOR,
        );
        this.logger.debug(
          `Mercado Livre generated link output after product ID fallback: ${output ? 'found' : 'not found'}`,
        );

        if (!output) {
          await this.logGeneratorFields(capturePage);
          await this.logPageSnapshot(
            capturePage,
            'generated affiliate link output not found after fallback',
            input.productId,
          );
          throw this.layoutChanged(
            'Mercado Livre generated affiliate link was not found',
          );
        }
      }

      const capturedAffiliateUrl = await this.readUrl(output);

      if (!capturedAffiliateUrl) {
        await this.logGeneratorFields(capturePage);
        await this.logPageSnapshot(
          capturePage,
          'generated affiliate link output was present but invalid',
          input.productId,
        );
        throw this.layoutChanged(
          'Mercado Livre generated an invalid affiliate link',
        );
      }

      this.logger.log(
        `Mercado Livre affiliate link captured for product ${input.productId}`,
      );
      return { capturedAffiliateUrl };
    } finally {
      this.logger.debug(
        `Closing Mercado Livre browser session for product ${input.productId}`,
      );
      await session.close();
    }
  }

  private async assertPageCanCapture(page: Page): Promise<void> {
    if (await this.isVisible(page, CAPTCHA_SELECTOR)) {
      this.logger.warn(
        `Mercado Livre CAPTCHA detected. Current URL: ${page.url()}`,
      );
      throw new AffiliateLinkCaptureManualRequiredError(
        'Mercado Livre requires CAPTCHA resolution',
        AutomationErrorType.CaptchaRequired,
      );
    }

    const currentUrl = page.url().toLowerCase();
    const redirectedToLogin =
      currentUrl.includes('auth.mercadolivre.com') ||
      currentUrl.includes('/login');

    if (
      redirectedToLogin ||
      (await this.isVisible(page, SESSION_INVALID_SELECTOR))
    ) {
      this.logger.warn(
        `Mercado Livre session invalid or redirected to login. Current URL: ${page.url()}`,
      );
      throw new AffiliateLinkCaptureManualRequiredError(
        'Mercado Livre authenticated session is invalid or expired',
        AutomationErrorType.SessionInvalid,
      );
    }
  }

  private async dismissCashbackModalIfPresent(page: Page): Promise<boolean> {
    const acknowledgementButton =
      await this.findCashbackAcknowledgementLocator(page);

    if (!acknowledgementButton) {
      this.logger.debug('Mercado Livre cashback modal was not visible');
      return false;
    }

    this.logger.log('Mercado Livre cashback modal found; clicking Entendi');
    await acknowledgementButton.click();
    return true;
  }

  private async findCashbackAcknowledgementLocator(
    page: Page,
  ): Promise<Locator | null> {
    const candidates = [
      page
        .locator('div')
        .filter({ hasText: /^Entendi$/ })
        .first(),
      page.locator(CASHBACK_ACKNOWLEDGEMENT_SELECTOR).first(),
    ];

    for (const locator of candidates) {
      await locator
        .waitFor({
          state: 'visible',
          timeout: Math.min(
            this.getCaptureTimeout(),
            CASHBACK_MODAL_TIMEOUT_MS,
          ),
        })
        .catch(() => undefined);

      if (await locator.isVisible().catch(() => false)) {
        return locator;
      }
    }

    return null;
  }

  private async waitForVisibleLocator(
    page: Page,
    selector: string,
  ): Promise<Locator | null> {
    try {
      const locator = page.locator(selector).first();
      await locator.waitFor({
        state: 'visible',
        timeout: this.getCaptureTimeout(),
      });
      return locator;
    } catch {
      return null;
    }
  }

  private async findAffiliateActionLocator(
    page: Page,
  ): Promise<Locator | null> {
    for (const selector of AFFILIATE_ACTION_SELECTORS) {
      const locator = await this.waitForVisibleLocator(page, selector);

      if (locator) {
        this.logger.debug(
          `Mercado Livre affiliate action selector matched: ${selector}`,
        );
        return locator;
      }
    }

    return null;
  }

  private async findVisibleLocator(
    page: Page,
    selector: string,
  ): Promise<Locator | null> {
    try {
      const locator = page.locator(selector).first();

      return (await locator.isVisible().catch(() => false)) ? locator : null;
    } catch {
      return null;
    }
  }

  private async tryGenerateByProductId(
    page: Page,
    originalProductUrl: string,
  ): Promise<void> {
    const externalId = extractMercadoLivreExternalId(originalProductUrl);

    if (!externalId) {
      this.logger.warn(
        'Mercado Livre product ID fallback skipped: external ID could not be extracted from original URL',
      );
      return;
    }

    this.logger.debug(
      `Mercado Livre product ID fallback extracted external ID ${externalId}`,
    );
    const productIdMode = await this.findVisibleLocator(
      page,
      PRODUCT_ID_MODE_SELECTOR,
    );
    this.logger.debug(
      `Mercado Livre product ID mode control: ${productIdMode ? 'found' : 'not found'}`,
    );
    await productIdMode?.click();

    const productIdInput = await this.waitForVisibleLocator(
      page,
      PRODUCT_ID_INPUT_SELECTOR,
    );
    this.logger.debug(
      `Mercado Livre product ID input: ${productIdInput ? 'found' : 'not found'}`,
    );
    await productIdInput?.fill(externalId);
  }

  private async waitForGeneratedPage(page: Page): Promise<Page | null> {
    const context = page.context();

    if (!('waitForEvent' in context)) {
      return null;
    }

    try {
      const generatedPage = await context.waitForEvent('page', {
        timeout: Math.min(this.getCaptureTimeout(), POPUP_CAPTURE_TIMEOUT_MS),
      });
      return generatedPage;
    } catch {
      this.logger.debug('Mercado Livre flow did not open a new page');
      return null;
    }
  }

  private async logPageSnapshot(
    page: Page,
    reason: string,
    productId: string,
  ): Promise<void> {
    let title = 'unknown';
    let bodySnippet = '';

    try {
      title = await page.title();
    } catch {
      title = 'unknown';
    }

    try {
      bodySnippet = await page.evaluate((limit) => {
        const text = document.body?.innerText ?? '';

        return text.replace(/\s+/g, ' ').trim().slice(0, limit);
      }, PAGE_TEXT_SNIPPET_LENGTH);
    } catch {
      bodySnippet = '';
    }

    const screenshotPath = await this.savePageScreenshot(
      page,
      reason,
      productId,
    );

    this.logger.warn(
      `Mercado Livre capture snapshot (${reason}). URL: ${page.url()}; title: "${title}"; screenshot: ${screenshotPath ?? 'not saved'}; body: "${bodySnippet}"`,
    );
  }

  private async savePageScreenshot(
    page: Page,
    reason: string,
    productId: string,
  ): Promise<string | null> {
    const directory = this.getScreenshotDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeReason = reason
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, SCREENSHOT_REASON_MAX_LENGTH);
    const filePath = join(
      directory,
      `${timestamp}-${productId}-${safeReason || 'snapshot'}.png`,
    );

    try {
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: filePath, fullPage: true });

      return filePath;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `Mercado Livre capture screenshot could not be saved. Reason: ${message}`,
      );
      return null;
    }
  }

  private async logGeneratorFields(page: Page): Promise<void> {
    const [link, productId, suggestedText] = await Promise.all([
      this.readOptionalFieldValue(page, AFFILIATE_URL_SELECTOR),
      this.readOptionalFieldValue(page, PRODUCT_ID_INPUT_SELECTOR),
      this.readOptionalFieldValue(page, SUGGESTED_TEXT_SELECTOR),
    ]);

    this.logger.warn(
      `Mercado Livre link generator fields. link: "${link ?? ''}"; productId: "${productId ?? ''}"; suggestedText: "${suggestedText ?? ''}"`,
    );
  }

  private async readOptionalFieldValue(
    page: Page,
    selector: string,
  ): Promise<string | null> {
    try {
      const locator = page.locator(selector).first();
      const value = await locator.inputValue().catch(() => null);
      const text = value ?? (await locator.textContent().catch(() => null));
      const normalized = text?.trim();

      return normalized || null;
    } catch {
      return null;
    }
  }

  private async isVisible(page: Page, selector: string): Promise<boolean> {
    try {
      return await page.locator(selector).first().isVisible();
    } catch {
      return false;
    }
  }

  private async readUrl(locator: Locator): Promise<string | null> {
    const candidates = [
      await locator.getAttribute('value'),
      await locator.getAttribute('href'),
      await locator.inputValue().catch(() => null),
      await locator.textContent(),
    ];

    for (const candidate of candidates) {
      const normalized = candidate?.trim();

      if (!normalized) {
        continue;
      }

      try {
        const url = new URL(normalized);

        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return url.toString();
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private getCaptureTimeout(): number {
    const configuredTimeout = Number(
      this.configService.get<string>('MERCADO_LIVRE_CAPTURE_TIMEOUT_MS'),
    );

    return Number.isInteger(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : DEFAULT_CAPTURE_TIMEOUT_MS;
  }

  private getScreenshotDirectory(): string {
    return (
      this.configService.get<string>('AFFILIATE_LINK_CAPTURE_SCREENSHOT_DIR') ||
      join(process.cwd(), '.tmp', 'affiliate-link-capture-screenshots')
    );
  }

  private layoutChanged(
    message: string,
  ): AffiliateLinkCaptureManualRequiredError {
    return new AffiliateLinkCaptureManualRequiredError(
      message,
      AutomationErrorType.LayoutChanged,
    );
  }
}
