import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';
import { Marketplace } from '../../../shared/enums/marketplace.enum';

export type MarketplaceSearchResultOrigin = {
  resultId: string;
  search: {
    searchId: string;
    marketplace: Marketplace;
    query: string | null;
    category: string | null;
  };
  task: {
    taskId: string;
    type: AutomationTaskType;
    status: AutomationTaskStatus;
    marketplace: string | null;
    createdAt: Date;
    finishedAt: Date | null;
  };
};

export enum MarketplaceSearchResultOriginState {
  Found = 'found',
  Legacy = 'legacy',
}

export type MarketplaceSearchResultOriginLookup =
  | {
      state: MarketplaceSearchResultOriginState.Found;
      origin: MarketplaceSearchResultOrigin;
    }
  | { state: MarketplaceSearchResultOriginState.Legacy };

export abstract class MarketplaceSearchResultsRepository {
  abstract findOriginTask(
    resultId: string,
  ): Promise<MarketplaceSearchResultOriginLookup | null>;
}
