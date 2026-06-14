import { Marketplace } from '../../../shared/enums/marketplace.enum';

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

export abstract class MarketplaceProductsRepository {
  abstract saveSearchResults(
    searchId: string,
    products: PersistMarketplaceProductInput[],
    foundCount: number,
  ): Promise<number>;
}
