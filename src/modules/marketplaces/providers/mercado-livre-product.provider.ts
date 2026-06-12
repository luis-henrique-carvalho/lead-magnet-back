import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';

import {
  BrowserSessionNotConfiguredError,
  BrowserSessionStateError,
  PlaywrightService,
} from '../../../infra/browser';
import { Marketplace } from '../../../shared/enums/marketplace.enum';

import {
  MarketplaceProduct,
  MarketplaceProductDetails,
  MarketplaceProductSearchProvider,
  SearchProductsInput,
} from './marketplace-product-search-provider.interface';

const MERCADO_LIVRE_HUB_URL =
  'https://www.mercadolivre.com.br/afiliados/hub?is_affiliate=true#menu-user';
const PRODUCT_HOST_PATTERN = /mercadolivre|mercadolibre/i;
const PRODUCT_PATH_EXCLUSIONS = ['/afiliados/', '/hub'];
const MENU_TEXTS = [
  'produtos selecionados para você',
  'procurar',
  'filtrar',
  'ganhos extras',
  'mais',
];

type MercadoLivreScrapedCard = {
  id?: string | null;
  href: string;
  title?: string | null;
  text?: string | null;
  ariaLabel?: string | null;
  imageUrl?: string | null;
  priceText?: string | null;
  ratingText?: string | null;
  reviewsText?: string | null;
  salesText?: string | null;
  gainsText?: string | null;
};

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

      await this.waitForHubPage(session.page);

      if (input.query) {
        await this.executeSearchQuery(session.page, input.query);
      }

      let products = await this.scrapeProducts(session.page);

      if (products.length === 0 && !input.query) {
        this.logger.log(
          'No products found initially. Attempting to reveal products tab...',
        );
        await this.tryRevealProductsTab(session.page);
        products = await this.scrapeProducts(session.page);
      }

      if (input.category) {
        this.logger.log(
          `Associating category "${input.category}" to all ${products.length} scraped products.`,
        );
        products = products.map((p) => ({ ...p, category: input.category }));
      }

      const filtered = this.filterProducts(products, input);
      this.logger.log(
        `Scraping complete. Found ${products.length} products total, ${filtered.length} matching filters. Returning up to ${input.limit}.`,
      );
      return filtered.slice(0, input.limit);
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
    await page
      .locator(
        '#recommendations_card, .polycards__container, .recommendations-filters-desktop',
      )
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch((error: unknown) => this.handlePageTimeout(page, error));
  }

  private async handlePageTimeout(page: Page, error: unknown): Promise<void> {
    const err = error instanceof Error ? error : new Error(String(error));
    const currentUrl = page.url();
    const pageTitle = await page.title().catch(() => 'unknown');
    const bodyText = await page
      .evaluate(() => document.body.innerText)
      .catch(() => '');
    this.logger.warn(
      `Wait for page elements timed out: ${err.message}. Current URL: ${currentUrl}, Page Title: "${pageTitle}"`,
    );
    if (
      bodyText.toLowerCase().includes('login') ||
      bodyText.toLowerCase().includes('entrar')
    ) {
      this.logger.warn('Page content seems to request login/authentication.');
    } else if (
      bodyText.toLowerCase().includes('robo') ||
      bodyText.toLowerCase().includes('robot') ||
      bodyText.toLowerCase().includes('captcha')
    ) {
      this.logger.warn('Page content seems to contain a CAPTCHA challenge.');
    } else {
      this.logger.warn(
        `Body snippet: ${bodyText.substring(0, 500).replace(/\s+/g, ' ')}...`,
      );
    }
  }

  private async executeSearchQuery(page: Page, query: string): Promise<void> {
    this.logger.log(
      `Query parameter is present. Executing search on page for "${query}"...`,
    );

    const searchInput = page
      .locator(
        'input[data-andes-searchbox-input="true"], input[placeholder*="buscar" i], input[placeholder*="busque" i]',
      )
      .first();

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

      this.logger.log(
        'Waiting for "Procurar" tab/button to become visible...',
      );
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
          this.logger.warn(
            'Could not find any visible "Procurar" tab/button to reveal search input.',
          );
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
      this.logger.warn('Search input textbox is not visible or not found.');
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
        throw new Error(
          `Mercado Livre browser session is not available: ${error.message}`,
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

export function normalizeMercadoLivreCard(
  card: MercadoLivreScrapedCard,
): MarketplaceProduct | null {
  if (!isMercadoLivreProductUrl(card.href)) {
    return null;
  }

  const title = pickMercadoLivreTitle(card);

  if (!title) {
    return null;
  }

  const text = normalizeWhitespace(
    [card.title, card.ariaLabel, card.text].filter(Boolean).join(' '),
  );

  return {
    externalId: card.id || extractMercadoLivreExternalId(card.href),
    marketplace: Marketplace.MercadoLivre,
    title,
    originalUrl: card.href,
    imageUrl: normalizeUrlLike(card.imageUrl) || undefined,
    price: parseMercadoLivrePrice(card.priceText || text || undefined),
    rating: parseMercadoLivreNumber(card.ratingText || text || undefined),
    reviewsCount: parseMercadoLivreCount(card.reviewsText || text || undefined),
    salesCount: parseMercadoLivreCount(card.salesText || text || undefined),
    rawData: {
      source: 'mercado-livre-hub-scrape',
      card,
      text,
    },
  };
}

function pickMercadoLivreTitle(card: MercadoLivreScrapedCard): string | null {
  const candidates = [card.title, card.ariaLabel, ...splitCardText(card.text)];

  for (const candidate of candidates) {
    const title = normalizeWhitespace(candidate);

    if (!looksLikeProductTitle(title)) {
      continue;
    }

    return title;
  }

  return null;
}

function splitCardText(text: string | null | undefined): string[] {
  return (
    normalizeWhitespace(text)
      ?.split(/\n|\u2022|\|/)
      .map((part) => part.trim())
      .filter(Boolean) ?? []
  );
}

function looksLikeProductTitle(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const lowered = value.toLowerCase();

  if (MENU_TEXTS.some((menuText) => lowered.includes(menuText))) {
    return false;
  }

  if (/^r\$\s?\d/i.test(lowered)) {
    return false;
  }

  if (/^\d+(?:[.,]\d+)?$/.test(lowered)) {
    return false;
  }

  return value.length >= 6;
}

function isMercadoLivreProductUrl(value: string | null): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    if (!PRODUCT_HOST_PATTERN.test(url.hostname)) {
      return false;
    }

    return !PRODUCT_PATH_EXCLUSIONS.some((segment) =>
      url.pathname.toLowerCase().includes(segment),
    );
  } catch {
    return false;
  }
}

function extractMercadoLivreExternalId(value: string): string | undefined {
  const match = value.match(/(ML[A-Z]?-\d+|MLB-[A-Z0-9-]+)/i);

  return match?.[1];
}

function normalizeUrlLike(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^\/\//.test(normalized)) {
    return `https:${normalized}`;
  }

  return null;
}

function normalizeWhitespace(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim() || '';

  return normalized.length > 0 ? normalized : null;
}

export function parseMercadoLivrePrice(
  value: string | null | undefined,
): number | undefined {
  const match = value?.match(/R\$\s*([\d.]+,\d{2}|[\d.]+)/i);

  if (!match) {
    return undefined;
  }

  return Number(match[1].replace(/\./g, '').replace(',', '.')) || undefined;
}

function parseMercadoLivreNumber(
  value: string | null | undefined,
): number | undefined {
  const match = value?.match(/(\d+(?:[.,]\d+)?)/);

  if (!match) {
    return undefined;
  }

  return Number(match[1].replace(',', '.')) || undefined;
}

function parseMercadoLivreCount(
  value: string | null | undefined,
): number | undefined {
  const match = value?.match(/(\d[\d.]*)/);

  if (!match) {
    return undefined;
  }

  return Number(match[1].replace(/\./g, '')) || undefined;
}
