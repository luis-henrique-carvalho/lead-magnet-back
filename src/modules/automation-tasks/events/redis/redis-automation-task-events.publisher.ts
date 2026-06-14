import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AutomationTaskEventsPublisher,
  PublishableAutomationTask,
} from '../interfaces/automation-task-events.publisher';
import {
  AutomationTaskDomainEvent,
  AutomationTaskEventType,
} from '../interfaces/automation-task-events.subscriber';
import {
  AUTOMATION_TASK_EVENTS_CHANNEL,
  AUTOMATION_TASK_EVENTS_REDIS_PUBLISHER,
} from './redis-pub-sub-client';
import type { RedisPubSubClient } from './redis-pub-sub-client';

@Injectable()
export class RedisAutomationTaskEventsPublisher
  implements AutomationTaskEventsPublisher, OnModuleDestroy
{
  constructor(
    @Inject(AUTOMATION_TASK_EVENTS_REDIS_PUBLISHER)
    private readonly redis: RedisPubSubClient,
  ) {}

  async publish(
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

    await this.redis.publish(
      AUTOMATION_TASK_EVENTS_CHANNEL,
      JSON.stringify(event),
    );

    return event;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
