import {
  Inject,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Browser, BrowserContext } from 'playwright';

import { Marketplace } from '../../../shared/enums/marketplace.enum';
import { MarketplaceStorageStateProvider } from '../storage-state/marketplace-storage-state.provider';
import { PLAYWRIGHT_BROWSER_TYPE } from './playwright.constants';
import type {
  AuthenticatedBrowserPage,
  PlaywrightBrowserType,
} from './playwright.types';

const DEFAULT_NAVIGATION_TIMEOUT_MS = 30_000;

@Injectable()
export class PlaywrightService implements OnModuleDestroy {
  private browser: Browser | null = null;
  private browserLaunchPromise: Promise<Browser> | null = null;
  private readonly contexts = new Set<BrowserContext>();
  private isDestroying = false;

  constructor(
    @Inject(PLAYWRIGHT_BROWSER_TYPE)
    private readonly browserType: PlaywrightBrowserType,
    private readonly storageStateProvider: MarketplaceStorageStateProvider,
    private readonly configService: ConfigService,
  ) {}

  async openAuthenticatedPage(
    marketplace: Marketplace,
    url: string,
  ): Promise<AuthenticatedBrowserPage> {
    if (this.isDestroying) {
      throw new ServiceUnavailableException(
        'Browser infrastructure is shutting down',
      );
    }

    this.assertHttpUrl(url);

    const storageState =
      await this.storageStateProvider.getStorageState(marketplace);
    const browser = await this.getBrowser();
    const context = await browser.newContext({ storageState });
    this.contexts.add(context);

    try {
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(this.getNavigationTimeout());
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      return {
        context,
        page,
        close: () => this.closeContext(context),
      };
    } catch (error) {
      await this.closeContext(context);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.isDestroying = true;

    await Promise.allSettled(
      Array.from(this.contexts, (context) => this.closeContext(context)),
    );

    const browser = this.browser ?? (await this.getLaunchedBrowser());

    if (browser) {
      await browser.close();
    }

    this.browser = null;
    this.browserLaunchPromise = null;
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (!this.browserLaunchPromise) {
      this.browserLaunchPromise = this.browserType
        .launch({ headless: this.getHeadless() })
        .then((browser) => {
          this.browser = browser;
          return browser;
        })
        .catch((error: unknown) => {
          this.browserLaunchPromise = null;
          throw error;
        });
    }

    return this.browserLaunchPromise;
  }

  private async getLaunchedBrowser(): Promise<Browser | null> {
    if (!this.browserLaunchPromise) {
      return null;
    }

    try {
      return await this.browserLaunchPromise;
    } catch {
      return null;
    }
  }

  private async closeContext(context: BrowserContext): Promise<void> {
    if (!this.contexts.delete(context)) {
      return;
    }

    await context.close();
  }

  private getHeadless(): boolean {
    return (
      this.configService.get<string>('PLAYWRIGHT_HEADLESS', 'true') !== 'false'
    );
  }

  private getNavigationTimeout(): number {
    const configuredTimeout = Number(
      this.configService.get<string>('PLAYWRIGHT_NAVIGATION_TIMEOUT_MS'),
    );

    return Number.isInteger(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : DEFAULT_NAVIGATION_TIMEOUT_MS;
  }

  private assertHttpUrl(url: string): void {
    const parsedUrl = new URL(url);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new TypeError('Browser navigation only supports HTTP(S) URLs');
    }
  }
}
