import {
  AutomationTask,
  CreateAutomationTaskInput,
  StartAutomationTaskAttemptInput,
  UpdateAutomationTaskInput,
} from './automation-task.types';

export abstract class AutomationTasksRepository {
  abstract create(input: CreateAutomationTaskInput): Promise<AutomationTask>;

  abstract findById(id: string): Promise<AutomationTask | null>;

  abstract startAttempt(
    id: string,
    input: StartAutomationTaskAttemptInput,
  ): Promise<AutomationTask | null>;

  abstract finishAttempt(
    id: string,
    jobId: string,
    input: UpdateAutomationTaskInput,
  ): Promise<AutomationTask | null>;
}
