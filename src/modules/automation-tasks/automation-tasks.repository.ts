import {
  AutomationTask,
  CreateAutomationTaskInput,
  UpdateAutomationTaskInput,
} from './automation-task.types';

export abstract class AutomationTasksRepository {
  abstract create(input: CreateAutomationTaskInput): Promise<AutomationTask>;

  abstract findById(id: string): Promise<AutomationTask | null>;

  abstract update(
    id: string,
    input: UpdateAutomationTaskInput,
  ): Promise<AutomationTask | null>;
}
