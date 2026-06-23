import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';

import {
  BrowserSessionNotConfiguredError,
  BrowserSessionStateError,
  PlaywrightService,
} from '../../../../infra/browser';
import { AutomationErrorType } from '../../../../shared/enums/automation-error-type.enum';
import { Marketplace } from '../../../../shared/enums/marketplace.enum';

import {
  MarketplaceProduct,
  MarketplaceProductDetails,
  MarketplaceProductSearchProvider,
  SearchProductsInput,
} from '../marketplace-product-search-provider.interface';
import { MarketplaceProductSearchError } from '../marketplace-product-search.error';

import {
  MERCADO_LIVRE_HUB_URL,
  MercadoLivreScrapedCard,
  normalizeMercadoLivreCard,
  parseMercadoLivrePrice,
} from './mercado-livre-product-parser.utils';

const HUB_READY_SELECTOR =
  '#recommendations_card, .polycards__container, .recommendations-filters-desktop';
const HUB_READY_TIMEOUT_MS = 15_000;
const SEARCH_INPUT_SELECTOR =
  'input[data-andes-searchbox-input="true"], input[placeholder*="buscar" i], input[placeholder*="busque" i]';
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
const THROTTLING_TEXT_PATTERN =
  /muitas requisi(?:ç|c)ões|too many requests|rate limit|tente novamente mais tarde/i;

@Injectable()
export class MercadoLivreProductProvider implements MarketplaceProductSearchProvider {
  readonly marketplace = Marketplace.MercadoLivre;
  private readonly logger = new Logger(MercadoLivreProductProvider.name);

  constructor(private readonly playwrightService: PlaywrightService) {}

  async searchProducts(
    input: SearchProductsInput,
  ): Promise<MarketplaceProduct[]> {
    this.logger.log(
      `Starting product search: query="${input.query || ''}", category="${input.category || ''}", limit=${input.limit}`,
    );
    const session = await this.openAuthenticatedHub();

    try {
      this.logger.log('Hub session opened. Waiting for load state...');
      await session.page.waitForLoadState('networkidle').catch(() => undefined);

      await this.assertHubPageCanBeScraped(session.page);
      await this.waitForHubPage(session.page);
      await this.assertHubPageCanBeScraped(session.page);

      if (input.query) {
        await this.executeSearchQuery(session.page, input.query);
        await this.assertHubPageCanBeScraped(session.page);
      }

      let products = await this.scrapeProducts(session.page);

      if (products.length === 0 && !input.query) {
        this.logger.log(
          'No products found initially. Attempting to reveal products tab...',
        );
        await this.tryRevealProductsTab(session.page);
        products = await this.scrapeProducts(session.page);
      }

      products = this.filterProducts(products, input);

      if (input.category) {
        this.logger.log(
          `Associating category "${input.category}" to all ${products.length} scraped products.`,
        );
        products = products.map((p) => ({ ...p, category: input.category }));
      }
      // TODO: Remover o filtro de categoria,
      // pois a busca já é feita com base na query e categoria, e o filtro manual pode ser impreciso ou redundante
      return products.slice(0, input.limit);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error during product search: ${err.message}`,
        err.stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }

  private async waitForHubPage(page: Page): Promise<void> {
    this.logger.log('Waiting for page elements to render...');
    try {
      await page
        .locator(HUB_READY_SELECTOR)
        .first()
        .waitFor({ state: 'visible', timeout: HUB_READY_TIMEOUT_MS });
    } catch (error) {
      throw await this.mapHubReadyTimeout(page, error);
    }
  }

  private async mapHubReadyTimeout(
    page: Page,
    error: unknown,
  ): Promise<MarketplaceProductSearchError> {
    const state = await this.getPageState(page);
    const detectedError = await this.detectPageError(page, state);
    const err = error instanceof Error ? error : new Error(String(error));

    this.logger.warn(
      `Wait for page elements timed out: ${err.message}. Current URL: ${state.currentUrl}, Page Title: "${state.pageTitle}"`,
    );

    if (detectedError) {
      return detectedError;
    }

    this.logger.warn(`Body snippet: ${state.bodySnippet}`);

    return new MarketplaceProductSearchError(
      'Mercado Livre hub layout was not recognized',
      AutomationErrorType.LayoutChanged,
      error,
    );
  }

  private async assertHubPageCanBeScraped(page: Page): Promise<void> {
    const state = await this.getPageState(page);
    const detectedError = await this.detectPageError(page, state);

    if (detectedError) {
      throw detectedError;
    }
  }

  private async detectPageError(
    page: Page,
    state: {
      currentUrl: string;
      pageTitle: string;
      bodyText: string;
    },
  ): Promise<MarketplaceProductSearchError | null> {
    const haystack = `${state.currentUrl} ${state.pageTitle} ${state.bodyText}`;

    if (
      (await this.isVisible(page, CAPTCHA_SELECTOR)) ||
      /captcha|não sou um robô|nao sou um robo|robot/i.test(haystack)
    ) {
      return new MarketplaceProductSearchError(
        'Mercado Livre requires CAPTCHA resolution',
        AutomationErrorType.CaptchaRequired,
      );
    }

    if (THROTTLING_TEXT_PATTERN.test(haystack)) {
      return new MarketplaceProductSearchError(
        'Mercado Livre throttled the product search',
        AutomationErrorType.Throttling,
      );
    }

    const currentUrl = state.currentUrl.toLowerCase();
    const redirectedToLogin =
      currentUrl.includes('/jms/mlb/lgz/msl/login') ||
      currentUrl.includes('/login') ||
      currentUrl.includes('auth.mercadolivre.com') ||
      currentUrl.includes('registration.mercadolivre.com');

    if (
      redirectedToLogin ||
      (await this.isVisible(page, SESSION_INVALID_SELECTOR)) ||
      /digite seu e-mail ou telefone|iniciar sessão|entre na sua conta/i.test(
        haystack,
      )
    ) {
      return new MarketplaceProductSearchError(
        'Mercado Livre authenticated session is invalid or expired',
        AutomationErrorType.SessionInvalid,
      );
    }

    return null;
  }

  private async getPageState(page: Page): Promise<{
    currentUrl: string;
    pageTitle: string;
    bodyText: string;
    bodySnippet: string;
  }> {
    const currentUrl = page.url();
    const pageTitle = await page.title().catch(() => 'unknown');
    const bodyText = await page
      .evaluate(() => document.body?.innerText ?? '')
      .catch(() => '');

    return {
      currentUrl,
      pageTitle,
      bodyText,
      bodySnippet: `${bodyText.substring(0, 500).replace(/\s+/g, ' ')}...`,
    };
  }

  private async isVisible(page: Page, selector: string): Promise<boolean> {
    return page
      .locator(selector)
      .first()
      .isVisible()
      .catch(() => false);
  }

  private async executeSearchQuery(page: Page, query: string): Promise<void> {
    this.logger.log(
      `Query parameter is present. Executing search on page for "${query}"...`,
    );

    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();

    if (!(await searchInput.isVisible().catch(() => false))) {
      this.logger.log(
        'Search input is not visible. Attempting to click "Procurar" tab/button...',
      );

      const searchTab = page
        .locator('div')
        .filter({ hasText: /^Procurar$/ })
        .nth(1);

      const altSearchTab = page.getByRole('button', {
        name: /Procurar/i,
      });

      this.logger.log('Waiting for "Procurar" tab/button to become visible...');
      await Promise.race([
        searchTab
          .waitFor({ state: 'visible', timeout: 3000 })
          .catch(() => undefined),
        altSearchTab
          .waitFor({ state: 'visible', timeout: 3000 })
          .catch(() => undefined),
      ]);

      if (await searchTab.isVisible().catch(() => false)) {
        this.logger.log('Found "Procurar" tab as div. Clicking it.');
        await searchTab.click();
      } else if (await altSearchTab.isVisible().catch(() => false)) {
        this.logger.log('Found "Procurar" tab as button. Clicking it.');
        await altSearchTab.click();
      } else {
        const textSearchTab = page
          .getByText('Procurar', { exact: true })
          .first();
        if (await textSearchTab.isVisible().catch(() => false)) {
          this.logger.log('Found "Procurar" tab by text. Clicking it.');
          await textSearchTab.click();
        } else {
          throw this.layoutChanged('Mercado Livre search tab was not found');
        }
      }
    }

    await searchInput
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => undefined);
    if (await searchInput.isVisible().catch(() => false)) {
      this.logger.log(
        'Search input is visible. Typing query and submitting...',
      );
      await searchInput.fill(query);
      await searchInput.press('Enter');
      this.logger.log('Waiting for search results to load...');
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await page.waitForTimeout(1000).catch(() => undefined);
    } else {
      throw this.layoutChanged('Mercado Livre search input was not found');
    }
  }

  async getProductDetails(
    productUrl: string,
  ): Promise<MarketplaceProductDetails> {
    this.logger.log(`Fetching product details for: ${productUrl}`);
    const session = await this.openAuthenticatedHub(productUrl);

    try {
      this.logger.log(
        'Session opened for details page. Waiting for load state...',
      );
      await session.page.waitForLoadState('networkidle').catch(() => undefined);

      const details = await session.page.evaluate(() => {
        const textOf = (selector: string): string | null => {
          const element = document.querySelector(selector);

          return element?.textContent?.replace(/\s+/g, ' ').trim() || null;
        };

        const metaContent = (selector: string): string | null =>
          document.querySelector(selector)?.getAttribute('content')?.trim() ||
          null;

        const bodyText = document.body?.innerText ?? '';
        const priceText =
          metaContent('meta[property="product:price:amount"]') ||
          metaContent('meta[property="og:price:amount"]') ||
          bodyText.match(/R\$\s*[\d.]+,\d{2}/)?.[0] ||
          null;

        return {
          title:
            textOf('h1') ||
            metaContent('meta[property="og:title"]') ||
            document.title ||
            null,
          description:
            metaContent('meta[name="description"]') ||
            metaContent('meta[property="og:description"]') ||
            null,
          sellerName:
            textOf('[data-testid*="seller" i]') ||
            textOf('a[href*="/perfil/"]') ||
            textOf('a[href*="/loja/"]') ||
            null,
          availability: /sem estoque|indispon[íi]vel|esgotado/i.test(bodyText)
            ? 'unavailable'
            : 'available',
          priceText,
          imageUrl:
            metaContent('meta[property="og:image"]') ||
            metaContent('meta[property="twitter:image"]') ||
            null,
        };
      });

      this.logger.log(
        `Scraped details from page: title="${details.title || ''}", priceText="${details.priceText || ''}", availability="${details.availability}"`,
      );

      return {
        marketplace: Marketplace.MercadoLivre,
        originalUrl: productUrl,
        title: details.title?.trim() || 'Produto Mercado Livre',
        description: details.description?.trim() || undefined,
        sellerName: details.sellerName?.trim() || undefined,
        availability: details.availability,
        imageUrl: details.imageUrl?.trim() || undefined,
        price: parseMercadoLivrePrice(details.priceText || undefined),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error fetching product details for ${productUrl}: ${err.message}`,
        err.stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }

  private async openAuthenticatedHub(url = MERCADO_LIVRE_HUB_URL) {
    try {
      return await this.playwrightService.openAuthenticatedPage(
        Marketplace.MercadoLivre,
        url,
      );
    } catch (error) {
      if (
        error instanceof BrowserSessionNotConfiguredError ||
        error instanceof BrowserSessionStateError
      ) {
        throw new MarketplaceProductSearchError(
          `Mercado Livre browser session is not available: ${error.message}`,
          AutomationErrorType.SessionInvalid,
          error,
        );
      }

      throw error;
    }
  }

  private async tryRevealProductsTab(page: Page): Promise<void> {
    const possibleTabs = [
      page.getByRole('link', { name: /Produtos selecionados para você/i }),
      page.getByRole('button', { name: /Produtos selecionados para você/i }),
      page.getByText(/Produtos selecionados para você/i),
    ];

    for (const tab of possibleTabs) {
      if (!(await tab.isVisible().catch(() => false))) {
        continue;
      }

      await tab.click().catch(() => undefined);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      return;
    }
  }

  private async scrapeProducts(page: Page): Promise<MarketplaceProduct[]> {
    const cards = (await page.evaluate(() => {
      const normalize = (value: string | null | undefined): string | null => {
        const trimmed = value?.replace(/\s+/g, ' ').trim() || '';

        return trimmed.length > 0 ? trimmed : null;
      };

      const polyCards = document.querySelectorAll('.poly-card');
      if (polyCards.length > 0) {
        return Array.from(polyCards).map((card) => {
          const idInput = card.querySelector('input[name="id"]');
          const id = idInput ? idInput.getAttribute('value') : null;

          const titleEl = card.querySelector('.poly-component__title');
          const title = titleEl ? titleEl.textContent : null;
          const href = titleEl ? titleEl.getAttribute('href') : null;

          const imgEl = card.querySelector('img.poly-component__picture');
          const imageUrl = imgEl
            ? imgEl.getAttribute('src') || imgEl.getAttribute('data-src')
            : null;

          const priceEl = card.querySelector('.poly-price__current');
          let priceText: string | null = null;
          if (priceEl) {
            const symbol =
              priceEl.querySelector('.andes-money-amount__currency-symbol')
                ?.textContent || 'R$';
            const fraction =
              priceEl.querySelector('.andes-money-amount__fraction')
                ?.textContent || '';
            const cents =
              priceEl.querySelector('.andes-money-amount__cents')
                ?.textContent || '';
            if (fraction) {
              priceText = `${symbol} ${fraction}${cents ? ',' + cents : ''}`;
            } else {
              priceText = priceEl.textContent;
            }
          }

          const labelEl = card.querySelector(
            '.poly-component__chip .poly-component__label',
          );
          const gainsText = labelEl ? labelEl.textContent : null;

          const reviewEl = card.querySelector(
            '.poly-component__review-compacted',
          );
          const reviewText = reviewEl ? reviewEl.textContent : null;

          let ratingText: string | null = null;
          let salesText: string | null = null;
          if (reviewText) {
            const parts = reviewText.split('|').map((p) => p.trim());
            if (parts.length > 0) {
              ratingText = parts[0];
            }
            if (parts.length > 1) {
              salesText = parts[1];
            }
          }

          return {
            id,
            href: href || '',
            title: title || null,
            text: card.textContent || null,
            ariaLabel: title || null,
            imageUrl,
            priceText,
            ratingText,
            reviewsText: null,
            salesText,
            gainsText,
          };
        });
      }

      const extractCardText = (anchor: HTMLAnchorElement): string | null => {
        const container =
          anchor.closest('article, li, section, div') ??
          anchor.parentElement ??
          anchor;

        return normalize(container.textContent);
      };

      return Array.from(document.querySelectorAll('a[href]')).flatMap(
        (node) => {
          const anchor = node as HTMLAnchorElement;
          const href = normalize(anchor.href);

          if (!href) {
            return [];
          }

          const container =
            anchor.closest('article, li, section, div') ??
            anchor.parentElement ??
            anchor;
          const image =
            container.querySelector('img') ?? anchor.querySelector('img');

          return [
            {
              href,
              title: normalize(anchor.getAttribute('aria-label')),
              text: extractCardText(anchor),
              ariaLabel: normalize(anchor.getAttribute('aria-label')),
              imageUrl:
                normalize(image?.getAttribute('src')) ||
                normalize(image?.getAttribute('data-src')) ||
                normalize(image?.getAttribute('srcset')),
              priceText: normalize(
                container.textContent?.match(/R\$\s*[\d.]+,\d{2}/)?.[0],
              ),
              ratingText: normalize(
                container.textContent?.match(/\b\d(?:,\d)?\b/)?.[0],
              ),
              reviewsText: normalize(
                container.textContent?.match(
                  /\d[\d.]*\s*(?:avalia(?:ç|c)ões|reviews?)/i,
                )?.[0],
              ),
              salesText: normalize(
                container.textContent?.match(
                  /\d[\d.]*\s*(?:vendidos?|sales?)/i,
                )?.[0],
              ),
            },
          ];
        },
      );
    })) as MercadoLivreScrapedCard[];

    this.logger.log(
      `Raw scrape completed. Extracted ${cards.length} raw cards.`,
    );
    const normalized = cards
      .map((card) => normalizeMercadoLivreCard(card))
      .filter((product): product is MarketplaceProduct => Boolean(product));
    this.logger.log(
      `Normalized ${normalized.length} out of ${cards.length} raw cards.`,
    );

    return normalized;
  }

  private layoutChanged(message: string): MarketplaceProductSearchError {
    return new MarketplaceProductSearchError(
      message,
      AutomationErrorType.LayoutChanged,
    );
  }

  private filterProducts(
    products: MarketplaceProduct[],
    input: SearchProductsInput,
  ): MarketplaceProduct[] {
    const query = input.query?.trim().toLowerCase();
    const category = input.category?.trim().toLowerCase();

    return products.filter((product) => {
      const haystack = [
        product.title,
        product.category,
        typeof product.rawData === 'object' && product.rawData
          ? JSON.stringify(product.rawData)
          : null,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery = query ? haystack.includes(query) : true;
      const matchesCategory = category ? haystack.includes(category) : true;

      return matchesQuery && matchesCategory;
    });
  }
}
