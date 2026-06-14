import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';

export type PendingAutomationTaskDependency = {
  predecessorId: string;
  status: AutomationTaskStatus;
};

export enum AddAutomationTaskDependencyResult {
  Created = 'created',
  TaskNotFound = 'task_not_found',
  AlreadyExists = 'already_exists',
  CreatesCycle = 'creates_cycle',
}

export abstract class AutomationTaskDependenciesRepository {
  abstract add(
    predecessorId: string,
    successorId: string,
  ): Promise<AddAutomationTaskDependencyResult>;
  abstract findPending(
    successorId: string,
  ): Promise<PendingAutomationTaskDependency[]>;
}
