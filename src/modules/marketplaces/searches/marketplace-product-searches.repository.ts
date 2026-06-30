import type { AutomationTask } from '../../automation-tasks/automation-task.types';
import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';
import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';
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

export type MarketplaceSearchAffiliateCaptureTask = {
  taskId: string;
  status: AutomationTaskStatus;
  marketplace: Marketplace | null;
  productId: string | null;
  productTitle: string | null;
  originalProductUrl: string | null;
  capturedAffiliateUrl: string | null;
  taskCreatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  capturedAt: Date | null;
};

export type PaginatedMarketplaceSearchAffiliateCaptureTasks = Pagination & {
  items: MarketplaceSearchAffiliateCaptureTask[];
  total: number;
};

export type MarketplaceProductSearchHistoryItem = {
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
  task: {
    status: AutomationTaskStatus;
    error: string | null;
    errorType: AutomationErrorType | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    updatedAt: Date;
  };
};

export type MarketplaceSearchHistoryFilters = {
  query?: string;
  marketplace?: Marketplace;
  status?: AutomationTaskStatus;
};

export type PaginatedMarketplaceProductSearchHistory = Pagination & {
  items: MarketplaceProductSearchHistoryItem[];
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
  abstract findAffiliateLinkCaptureTasks(
    searchId: string,
    pagination: Pagination,
  ): Promise<PaginatedMarketplaceSearchAffiliateCaptureTasks | null>;
  abstract findAll(
    pagination: Pagination,
    filters?: MarketplaceSearchHistoryFilters,
  ): Promise<PaginatedMarketplaceProductSearchHistory>;
}
