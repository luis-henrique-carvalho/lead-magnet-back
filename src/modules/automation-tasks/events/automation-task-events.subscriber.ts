import { Observable } from 'rxjs';
import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';

export type AutomationTaskEventType = 'task.created' | 'task.updated';

export type AutomationTaskDomainEvent = {
  eventId: string;
  eventType: AutomationTaskEventType;
  taskId: string;
  type: AutomationTaskType;
  status: AutomationTaskStatus;
  marketplace: string | null;
  updatedAt: string;
};

export abstract class AutomationTaskEventsSubscriber {
  abstract readonly events$: Observable<AutomationTaskDomainEvent>;
}
