import { Marketplace } from '../../../../shared/enums/marketplace.enum';

export const MARKETPLACE_PRODUCT_SEARCH_QUEUE = 'marketplace-product-search';
export const SEARCH_PRODUCTS_JOB = 'search-products';

export type MarketplaceProductSearchJobData = {
  taskId: string;
  searchId: string;
  marketplace: Marketplace;
  query?: string;
  category?: string;
  limit: number;
};

export type MarketplaceProductSearchJobResult = {
  searchId: string;
  requestedCount: number;
  foundCount: number;
};
