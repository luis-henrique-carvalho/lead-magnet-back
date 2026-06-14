import { Subject } from 'rxjs';
import { randomUUID } from 'node:crypto';
import {
  AutomationTaskEventsPublisher,
  PublishableAutomationTask,
} from '../../../src/modules/automation-tasks/events/interfaces/automation-task-events.publisher';
import {
  AutomationTaskDomainEvent,
  AutomationTaskEventType,
  AutomationTaskEventsSubscriber,
} from '../../../src/modules/automation-tasks/events/interfaces/automation-task-events.subscriber';

export class InMemoryAutomationTaskEventsPublisher implements AutomationTaskEventsPublisher {
  readonly published: AutomationTaskDomainEvent[] = [];

  constructor(private readonly subject: Subject<AutomationTaskDomainEvent>) {}

  publish(
    eventType: AutomationTaskEventType,
    task: PublishableAutomationTask,
  ): Promise<AutomationTaskDomainEvent> {
    const event: AutomationTaskDomainEvent = {
      eventId: randomUUID(),
      eventType,
      taskId: task.id,
      type: task.type,
      status: task.status,
      marketplace: task.marketplace,
      updatedAt: task.updatedAt.toISOString(),
      ...(task.searchId !== undefined ? { searchId: task.searchId } : {}),
      ...(task.productId !== undefined ? { productId: task.productId } : {}),
    };

    this.published.push(event);
    this.subject.next(event);

    return Promise.resolve(event);
  }
}

export class InMemoryAutomationTaskEventsSubscriber extends AutomationTaskEventsSubscriber {
  readonly events$;

  constructor(subject: Subject<AutomationTaskDomainEvent>) {
    super();
    this.events$ = subject.asObservable();
  }
}

export function createInMemoryEventsPair(): {
  publisher: InMemoryAutomationTaskEventsPublisher;
  subscriber: InMemoryAutomationTaskEventsSubscriber;
  subject: Subject<AutomationTaskDomainEvent>;
} {
  const subject = new Subject<AutomationTaskDomainEvent>();
  return {
    publisher: new InMemoryAutomationTaskEventsPublisher(subject),
    subscriber: new InMemoryAutomationTaskEventsSubscriber(subject),
    subject,
  };
}
