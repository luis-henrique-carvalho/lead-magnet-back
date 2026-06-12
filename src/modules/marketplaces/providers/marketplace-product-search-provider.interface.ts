import { Marketplace } from '../../../shared/enums/marketplace.enum';

export type SearchProductsInput = {
  marketplace: Marketplace;
  query?: string;
  category?: string;
  limit: number;
};

export type MarketplaceProduct = {
  externalId?: string;
  marketplace: Marketplace;
  title: string;
  originalUrl: string;
  imageUrl?: string;
  price?: number;
  rating?: number;
  reviewsCount?: number;
  salesCount?: number;
  category?: string;
  rawData?: unknown;
};

export type MarketplaceProductDetails = MarketplaceProduct & {
  description?: string;
  sellerName?: string;
  availability?: string;
};

export interface MarketplaceProductSearchProvider {
  readonly marketplace: Marketplace;

  searchProducts(input: SearchProductsInput): Promise<MarketplaceProduct[]>;

  getProductDetails(productUrl: string): Promise<MarketplaceProductDetails>;
}
