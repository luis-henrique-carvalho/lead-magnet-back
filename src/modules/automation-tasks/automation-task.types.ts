import { AutomationErrorType } from '../../shared/enums/automation-error-type.enum';
import { AutomationTaskStatus } from '../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../shared/enums/automation-task-type.enum';

export type AutomationTask = {
  id: string;
  type: AutomationTaskType;
  marketplace: string | null;
  status: AutomationTaskStatus;
  result: unknown;
  error: string | null;
  errorType: AutomationErrorType | null;
  attempts: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  attemptsHistory?: AutomationTaskAttempt[];
  marketplaceSearch?: MarketplaceProductSearchResult | null;
  affiliateLinkCapture?: AffiliateLinkCaptureResult | null;
  successorLinks?: AutomationTaskDependency[];
};

export type AutomationTaskAttempt = {
  id: string;
  taskId: string;
  number: number;
  jobId: string;
  status: AutomationTaskStatus;
  error: string | null;
  errorType: AutomationErrorType | null;
  metadata: unknown;
  startedAt: Date;
  finishedAt: Date | null;
};

export type MarketplaceProductSearchResult = {
  id: string;
  marketplace: string;
  query: string | null;
  category: string | null;
  requestedLimit: number;
  foundCount: number;
  savedCount: number;
  completedAt: Date | null;
  results: Array<{
    discoveredAt: Date;
    product: unknown;
  }>;
};

export type AffiliateLinkCaptureResult = {
  sourceProductId: string;
  marketplace: string;
  originalProductUrl: string;
  capturedAffiliateUrl: string;
  createdAt: Date;
};

export type AutomationTaskDependency = {
  predecessorId: string;
  required: boolean;
  predecessor: Pick<AutomationTask, 'id' | 'status' | 'type'> & {
    marketplaceSearch?: { id: string } | null;
  };
};

export type CreateAutomationTaskInput = {
  type: AutomationTaskType;
  marketplace?: string;
};

export type UpdateAutomationTaskInput = {
  status: AutomationTaskStatus;
  result?: unknown;
  error?: string | null;
  errorType?: AutomationErrorType | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

export type StartAutomationTaskAttemptInput = {
  jobId: string;
  metadata?: unknown;
};
