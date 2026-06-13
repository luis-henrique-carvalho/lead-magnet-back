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
  'form[action*="validateCaptcha" i]',
  'img[src*="captcha" i]',
  'input[name="cvf_captcha_input"]',
  'body:has-text("Digite os caracteres que você vê")',
  'body:has-text("Enter the characters you see")',
].join(', ');

const SESSION_INVALID_SELECTOR = [
  'form[name="signIn"]',
  'form[action*="signin" i]',
  'input[name="email"]',
  'input[name="password"]',
  'body:has-text("Fazer login")',
].join(', ');

const SITE_STRIPE_ACTION_SELECTOR = [
  '#amzn-ss-get-link-button',
  '[data-testid*="get-link" i]',
  'button:has-text("Obter link")',
  'a:has-text("Obter link")',
  'button:has-text("Get Link")',
  'a:has-text("Get Link")',
].join(', ');

const TEXT_LINK_ACTION_SELECTOR = [
  '#amzn-ss-text-link',
  '[data-testid*="text-link" i]',
  'button:has-text("Texto")',
  'a:has-text("Texto")',
  'button:has-text("Text")',
  'a:has-text("Text")',
].join(', ');

const AFFILIATE_URL_SELECTOR = [
  '#amzn-ss-text-shortlink-textarea',
  '#amzn-ss-text-link-code',
  '[data-testid*="affiliate-link" i] input',
  '[data-testid*="affiliate-link" i] textarea',
  'input[aria-label*="link" i][value^="http"]',
  'textarea[aria-label*="link" i]',
  'input[readonly][value^="http"]',
].join(', ');

@Injectable()
export class AmazonAffiliateLinkCaptureProvider implements AffiliateLinkCaptureProvider {
  readonly marketplaces = [Marketplace.Amazon] as const;

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
        Marketplace.Amazon,
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

      const getLinkAction = await this.waitForVisibleLocator(
        session.page,
        SITE_STRIPE_ACTION_SELECTOR,
      );

      if (!getLinkAction) {
        throw this.layoutChanged('Amazon SiteStripe action was not found');
      }

      await getLinkAction.click();
      await this.assertPageCanCapture(session.page);

      const textLinkAction = await this.findVisibleLocator(
        session.page,
        TEXT_LINK_ACTION_SELECTOR,
      );
      await textLinkAction?.click();

      const output = await this.waitForVisibleLocator(
        session.page,
        AFFILIATE_URL_SELECTOR,
      );

      if (!output) {
        throw this.layoutChanged(
          'Amazon generated affiliate link was not found',
        );
      }

      const capturedAffiliateUrl = await this.readUrl(output);

      if (!capturedAffiliateUrl) {
        throw this.layoutChanged('Amazon generated an invalid affiliate link');
      }

      return { capturedAffiliateUrl };
    } finally {
      await session.close();
    }
  }

  private async assertPageCanCapture(page: Page): Promise<void> {
    if (await this.isVisible(page, CAPTCHA_SELECTOR)) {
      throw new AffiliateLinkCaptureManualRequiredError(
        'Amazon requires CAPTCHA resolution',
        AutomationErrorType.CaptchaRequired,
      );
    }

    const currentUrl = page.url().toLowerCase();
    const redirectedToLogin =
      currentUrl.includes('/ap/signin') || currentUrl.includes('/signin');

    if (
      redirectedToLogin ||
      (await this.isVisible(page, SESSION_INVALID_SELECTOR))
    ) {
      throw new AffiliateLinkCaptureManualRequiredError(
        'Amazon authenticated session is invalid or expired',
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

  private async findVisibleLocator(
    page: Page,
    selector: string,
  ): Promise<Locator | null> {
    const locator = page.locator(selector).first();

    return (await locator.isVisible().catch(() => false)) ? locator : null;
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
      this.configService.get<string>('AMAZON_CAPTURE_TIMEOUT_MS'),
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
