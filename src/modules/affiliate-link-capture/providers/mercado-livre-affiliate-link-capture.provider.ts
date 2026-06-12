import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Locator, Page } from 'playwright';

import {
  BrowserSessionNotConfiguredError,
  BrowserSessionStateError,
  PlaywrightService,
} from '../../../infra/browser';
import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';
import { Marketplace } from '../../../shared/enums/marketplace.enum';
import { AffiliateLinkCaptureManualRequiredError } from '../errors/affiliate-link-capture-manual-required.error';
import {
  AffiliateLinkCaptureProvider,
  CaptureAffiliateLinkInput,
  CapturedAffiliateLink,
} from './affiliate-link-capture-provider.interface';

const DEFAULT_CAPTURE_TIMEOUT_MS = 5_000;

const CAPTCHA_SELECTOR = [
  'iframe[src*="captcha" i]',
  '[data-testid*="captcha" i]',
  'input[name*="captcha" i]',
  'body:has-text("Não sou um robô")',
  'body:has-text("Nao sou um robo")',
].join(', ');

const SESSION_INVALID_SELECTOR = [
  '[data-testid="login-form"]',
  'input[name="user_id"]',
  'input[name="password"]',
  'form[action*="login" i]',
  'body:has-text("Entre na sua conta")',
].join(', ');

const AFFILIATE_ACTION_SELECTOR = [
  '[data-testid*="affiliate" i] button',
  'button[aria-label*="link de afiliado" i]',
  'button:has-text("Gerar link")',
  'a:has-text("Gerar link")',
  'button:has-text("Link de afiliado")',
  'button:has-text("Compartilhar")',
].join(', ');

const AFFILIATE_URL_SELECTOR = [
  '[data-testid*="affiliate-link" i] input',
  '[data-testid*="affiliate-link" i] textarea',
  '[data-testid*="affiliate-link" i][href^="http"]',
  'input[aria-label*="link de afiliado" i]',
  'textarea[aria-label*="link de afiliado" i]',
  'input[readonly][value^="http"]',
].join(', ');

@Injectable()
export class MercadoLivreAffiliateLinkCaptureProvider implements AffiliateLinkCaptureProvider {
  readonly marketplaces = [Marketplace.MercadoLivre] as const;

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
      session = await this.playwrightService.openAuthenticatedPage(
        Marketplace.MercadoLivre,
        input.originalProductUrl,
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

      const action = await this.waitForVisibleLocator(
        session.page,
        AFFILIATE_ACTION_SELECTOR,
      );

      if (!action) {
        throw this.layoutChanged(
          'Mercado Livre affiliate link action was not found',
        );
      }

      await action.click();
      await this.assertPageCanCapture(session.page);

      const output = await this.waitForVisibleLocator(
        session.page,
        AFFILIATE_URL_SELECTOR,
      );

      if (!output) {
        throw this.layoutChanged(
          'Mercado Livre generated affiliate link was not found',
        );
      }

      const capturedAffiliateUrl = await this.readUrl(output);

      if (!capturedAffiliateUrl) {
        throw this.layoutChanged(
          'Mercado Livre generated an invalid affiliate link',
        );
      }

      return { capturedAffiliateUrl };
    } finally {
      await session.close();
    }
  }

  private async assertPageCanCapture(page: Page): Promise<void> {
    if (await this.isVisible(page, CAPTCHA_SELECTOR)) {
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
      throw new AffiliateLinkCaptureManualRequiredError(
        'Mercado Livre authenticated session is invalid or expired',
        AutomationErrorType.SessionInvalid,
      );
    }
  }

  private async waitForVisibleLocator(
    page: Page,
    selector: string,
  ): Promise<Locator | null> {
    const locator = page.locator(selector).first();

    try {
      await locator.waitFor({
        state: 'visible',
        timeout: this.getCaptureTimeout(),
      });
      return locator;
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

  private layoutChanged(
    message: string,
  ): AffiliateLinkCaptureManualRequiredError {
    return new AffiliateLinkCaptureManualRequiredError(
      message,
      AutomationErrorType.LayoutChanged,
    );
  }
}
