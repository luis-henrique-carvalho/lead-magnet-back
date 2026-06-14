import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';
import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';

export type AutomationTaskAttemptsPagination = {
  page: number;
  limit: number;
};

export type AutomationTaskAttemptHistoryItem = {
  number: number;
  jobId: string;
  status: AutomationTaskStatus;
  error: string | null;
  errorType: AutomationErrorType | null;
  metadata: unknown;
  startedAt: Date;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedAutomationTaskAttempts =
  AutomationTaskAttemptsPagination & {
    items: AutomationTaskAttemptHistoryItem[];
    total: number;
  };

export abstract class AutomationTaskAttemptsRepository {
  abstract findByTaskId(
    taskId: string,
    pagination: AutomationTaskAttemptsPagination,
  ): Promise<PaginatedAutomationTaskAttempts | null>;
}
