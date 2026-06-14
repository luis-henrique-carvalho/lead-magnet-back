import type { AutomationTask } from '../../automation-tasks/automation-task.types';
import { Marketplace } from '../../../shared/enums/marketplace.enum';

export type CreateMarketplaceProductSearchInput = {
  marketplace: Marketplace;
  query?: string;
  category?: string;
  limit: number;
};

export type CreatedMarketplaceProductSearch = {
  id: string;
  task: AutomationTask;
};

export type Pagination = { page: number; limit: number };

export type MarketplaceProductSearchDetail = {
  searchId: string;
  taskId: string;
  marketplace: Marketplace;
  query: string | null;
  category: string | null;
  requestedLimit: number;
  foundCount: number;
  savedCount: number;
  createdAt: Date;
  completedAt: Date | null;
};

export type MarketplaceSearchProduct = {
  resultId: string;
  discoveredAt: Date;
  product: {
    id: string;
    externalId: string | null;
    marketplace: Marketplace;
    title: string;
    originalUrl: string;
    imageUrl: string | null;
    price: number | null;
    rating: number | null;
    reviewsCount: number | null;
    salesCount: number | null;
    category: string | null;
  };
};

export type PaginatedMarketplaceSearchProducts = Pagination & {
  items: MarketplaceSearchProduct[];
  total: number;
};

export abstract class MarketplaceProductSearchesRepository {
  abstract createWithTask(
    input: CreateMarketplaceProductSearchInput,
  ): Promise<CreatedMarketplaceProductSearch>;
  abstract findById(
    searchId: string,
  ): Promise<MarketplaceProductSearchDetail | null>;
  abstract findProducts(
    searchId: string,
    pagination: Pagination,
  ): Promise<PaginatedMarketplaceSearchProducts | null>;
}
