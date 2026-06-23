import { Marketplace } from '../../../../shared/enums/marketplace.enum';
import { MarketplaceProduct } from '../marketplace-product-search-provider.interface';

export const MERCADO_LIVRE_HUB_URL =
  'https://www.mercadolivre.com.br/afiliados/hub?is_affiliate=true#menu-user';
export const PRODUCT_HOST_PATTERN =
  /(^|\.)mercadolivre\.com(?:\.br)?$|(^|\.)mercadolibre\./i;
export const PRODUCT_PATH_EXCLUSIONS = [
  '/afiliados/',
  '/hub',
  '/jms/',
  '/login',
  '/registration',
  '/privacidade',
  '/acessibilidade',
  '/ato-complaint',
  '/help',
  '/ajuda',
];
export const MENU_TEXTS = [
  'produtos selecionados para você',
  'procurar',
  'filtrar',
  'ganhos extras',
  'mais',
  'tenho um problema de segurança',
  'preciso de ajuda',
  'criar conta',
  'iniciar sessão',
  'digite seu e-mail',
  'como cuidamos da sua privacidade',
  'pular para o conteúdo',
  'comentar sobre acessibilidade',
];
const PRODUCT_ID_PATTERN = /\bML[A-Z]?-?\d{3,}\b/i;
const PRODUCT_PAGE_PATTERN = /\/p\/ML[A-Z]?\d{3,}\b/i;
const CLICK_PRODUCT_PATH_PATTERN =
  /\/mclics\/clicks\/external\/ML[A-Z]\/count/i;
const SCRIPT_OR_STYLE_PATTERN =
  /(?:^|\s)(?:a\.nav-|window\.|use strict|position:\s*absolute|background:\s*#|z-index:)/i;
const MAX_PRODUCT_TITLE_LENGTH = 180;

export type MercadoLivreScrapedCard = {
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
  const externalId = card.id || extractMercadoLivreExternalId(card.href);
  const imageUrl = normalizeUrlLike(card.imageUrl) || undefined;
  const price = parseMercadoLivrePrice(card.priceText || text || undefined);

  if (!externalId && !imageUrl && !price) {
    return null;
  }

  return {
    externalId,
    marketplace: Marketplace.MercadoLivre,
    title,
    originalUrl: card.href,
    imageUrl,
    price,
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

export function pickMercadoLivreTitle(
  card: MercadoLivreScrapedCard,
): string | null {
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

export function splitCardText(text: string | null | undefined): string[] {
  return (
    normalizeWhitespace(text)
      ?.split(/\n|\u2022|\|/)
      .map((part) => part.trim())
      .filter(Boolean) ?? []
  );
}

export function looksLikeProductTitle(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const lowered = value.toLowerCase();

  if (value.length > MAX_PRODUCT_TITLE_LENGTH) {
    return false;
  }

  if (MENU_TEXTS.some((menuText) => lowered.includes(menuText))) {
    return false;
  }

  if (SCRIPT_OR_STYLE_PATTERN.test(value)) {
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

export function isMercadoLivreProductUrl(value: string | null): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    if (!PRODUCT_HOST_PATTERN.test(url.hostname)) {
      return false;
    }

    if (
      PRODUCT_PATH_EXCLUSIONS.some((segment) =>
        url.pathname.toLowerCase().includes(segment),
      )
    ) {
      return false;
    }

    const decodedSearch = decodeURIComponent(url.search);
    const productMarkers = [
      url.pathname,
      decodedSearch,
      url.hash,
      url.searchParams.get('wid') ?? '',
      url.searchParams.get('pdp_filters') ?? '',
    ].join(' ');

    return (
      PRODUCT_PAGE_PATTERN.test(url.pathname) ||
      PRODUCT_ID_PATTERN.test(productMarkers) ||
      CLICK_PRODUCT_PATH_PATTERN.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function extractMercadoLivreExternalId(
  value: string,
): string | undefined {
  const directMatch = value.match(PRODUCT_ID_PATTERN);

  if (directMatch) {
    return directMatch[0];
  }

  try {
    const url = new URL(value);
    const candidates = [
      url.searchParams.get('wid'),
      url.searchParams.get('pdp_filters'),
      decodeURIComponent(url.search),
      url.hash,
    ].filter(Boolean);

    for (const candidate of candidates) {
      const match = candidate?.match(PRODUCT_ID_PATTERN);

      if (match) {
        return match[0];
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function normalizeUrlLike(
  value: string | null | undefined,
): string | null {
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

export function normalizeWhitespace(
  value: string | null | undefined,
): string | null {
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

export function parseMercadoLivreNumber(
  value: string | null | undefined,
): number | undefined {
  const match = value?.match(/(\d+(?:[.,]\d+)?)/);

  if (!match) {
    return undefined;
  }

  return Number(match[1].replace(',', '.')) || undefined;
}

export function parseMercadoLivreCount(
  value: string | null | undefined,
): number | undefined {
  const match = value?.match(/(\d[\d.]*)/);

  if (!match) {
    return undefined;
  }

  return Number(match[1].replace(/\./g, '')) || undefined;
}
