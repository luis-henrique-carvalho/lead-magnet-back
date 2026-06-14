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

export abstract class MarketplaceProductSearchesRepository {
  abstract createWithTask(
    input: CreateMarketplaceProductSearchInput,
  ): Promise<CreatedMarketplaceProductSearch>;
}
