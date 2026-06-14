import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';
import { AutomationTaskDependencyDirection } from './dto/automation-task-dependency-response.dto';

export type PendingAutomationTaskDependency = {
  predecessorId: string;
  status: AutomationTaskStatus;
};

export type AutomationTaskDependencyNavigation = {
  taskId: string;
  type: AutomationTaskType;
  status: AutomationTaskStatus;
  direction: AutomationTaskDependencyDirection;
  required: boolean;
  createdAt: Date;
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
  abstract findDependencies(
    successorId: string,
  ): Promise<AutomationTaskDependencyNavigation[] | null>;
  abstract findDependents(
    predecessorId: string,
  ): Promise<AutomationTaskDependencyNavigation[] | null>;
}
