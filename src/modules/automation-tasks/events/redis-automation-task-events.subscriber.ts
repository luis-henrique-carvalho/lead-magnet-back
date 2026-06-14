import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Subject } from 'rxjs';
import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';
import {
  AutomationTaskDomainEvent,
  AutomationTaskEventsSubscriber,
} from './automation-task-events.subscriber';
import {
  AUTOMATION_TASK_EVENTS_CHANNEL,
  AUTOMATION_TASK_EVENTS_REDIS_SUBSCRIBER,
} from './redis-pub-sub-client';
import type {
  RedisMessageListener,
  RedisPubSubClient,
} from './redis-pub-sub-client';

@Injectable()
export class RedisAutomationTaskEventsSubscriber
  extends AutomationTaskEventsSubscriber
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    RedisAutomationTaskEventsSubscriber.name,
  );
  private readonly eventsSubject = new Subject<AutomationTaskDomainEvent>();
  readonly events$ = this.eventsSubject.asObservable();
  private readonly messageListener: RedisMessageListener = (
    channel,
    message,
  ) => {
    if (channel !== AUTOMATION_TASK_EVENTS_CHANNEL) return;

    const event = this.parseEvent(message);
    if (event) this.eventsSubject.next(event);
  };

  constructor(
    @Inject(AUTOMATION_TASK_EVENTS_REDIS_SUBSCRIBER)
    private readonly redis: RedisPubSubClient,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.redis.on('message', this.messageListener);
    await this.redis.subscribe(AUTOMATION_TASK_EVENTS_CHANNEL);
  }

  async onModuleDestroy(): Promise<void> {
    this.redis.off('message', this.messageListener);
    await this.redis.unsubscribe(AUTOMATION_TASK_EVENTS_CHANNEL);
    this.eventsSubject.complete();
    await this.redis.quit();
  }

  private parseEvent(message: string): AutomationTaskDomainEvent | null {
    try {
      const value: unknown = JSON.parse(message);
      if (this.isDomainEvent(value)) return value;
    } catch (error) {
      this.logger.warn(
        `Ignoring malformed automation task event: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }

    this.logger.warn('Ignoring automation task event with an invalid payload');
    return null;
  }

  private isDomainEvent(value: unknown): value is AutomationTaskDomainEvent {
    if (!value || typeof value !== 'object') return false;
    const event = value as Partial<AutomationTaskDomainEvent>;

    return (
      typeof event.eventId === 'string' &&
      (event.eventType === 'task.created' ||
        event.eventType === 'task.updated') &&
      typeof event.taskId === 'string' &&
      Object.values(AutomationTaskType).includes(
        event.type as AutomationTaskType,
      ) &&
      Object.values(AutomationTaskStatus).includes(
        event.status as AutomationTaskStatus,
      ) &&
      (typeof event.marketplace === 'string' || event.marketplace === null) &&
      typeof event.updatedAt === 'string' &&
      !Number.isNaN(Date.parse(event.updatedAt))
    );
  }
}
