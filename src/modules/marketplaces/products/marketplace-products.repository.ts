import { Marketplace } from '../../../shared/enums/marketplace.enum';
import { Pagination } from '../searches/marketplace-product-searches.repository';

export type PersistMarketplaceProductInput = {
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

export type MarketplaceProductSearchOccurrence = {
  searchId: string;
  taskId: string;
  marketplace: Marketplace;
  query: string | null;
  category: string | null;
  requestedLimit: number;
  discoveredAt: Date;
};

export type PaginatedMarketplaceProductSearches = Pagination & {
  items: MarketplaceProductSearchOccurrence[];
  total: number;
  legacyAssociationsExcluded: true;
};

export abstract class MarketplaceProductsRepository {
  abstract saveSearchResults(
    searchId: string,
    products: PersistMarketplaceProductInput[],
    foundCount: number,
  ): Promise<number>;
  abstract findSearches(
    productId: string,
    pagination: Pagination,
  ): Promise<PaginatedMarketplaceProductSearches | null>;
}
