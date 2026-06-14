import { AutomationTask } from '../../automation-task.types';
import {
  AutomationTaskDomainEvent,
  AutomationTaskEventType,
} from './automation-task-events.subscriber';

export type PublishableAutomationTask = Pick<
  AutomationTask,
  'id' | 'type' | 'status' | 'marketplace' | 'updatedAt'
> & {
  searchId?: string | null;
  productId?: string | null;
};

export abstract class AutomationTaskEventsPublisher {
  abstract publish(
    eventType: AutomationTaskEventType,
    task: PublishableAutomationTask,
  ): Promise<AutomationTaskDomainEvent>;
}
