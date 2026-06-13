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
  incrementAttempts?: boolean;
};
