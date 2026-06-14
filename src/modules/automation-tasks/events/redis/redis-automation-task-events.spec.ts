import { firstValueFrom } from 'rxjs';
import { AutomationTaskStatus } from '../../../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../../../shared/enums/automation-task-type.enum';
import { RedisAutomationTaskEventsPublisher } from './redis-automation-task-events.publisher';
import { RedisAutomationTaskEventsSubscriber } from './redis-automation-task-events.subscriber';
import { RedisPubSubClient } from './redis-pub-sub-client';

describe('Redis automation task events', () => {
  const event = {
    eventId: 'event-id',
    eventType: 'task.updated' as const,
    taskId: 'task-id',
    type: AutomationTaskType.MarketplaceProductSearch,
    status: AutomationTaskStatus.Completed,
    marketplace: 'amazon',
    updatedAt: '2026-06-14T12:00:00.000Z',
  };

  it('publishes domain events on the automation task channel', async () => {
    const redis = {
      publish: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    const publisher = new RedisAutomationTaskEventsPublisher(
      redis as unknown as RedisPubSubClient,
    );

    const task = {
      id: event.taskId,
      type: event.type,
      status: event.status,
      marketplace: event.marketplace,
      updatedAt: new Date(event.updatedAt),
    };

    const first = await publisher.publish('task.updated', task);
    const second = await publisher.publish('task.updated', task);

    expect(first).toEqual(
      expect.objectContaining({
        eventType: 'task.updated',
        taskId: 'task-id',
        updatedAt: event.updatedAt,
      }),
    );
    expect(typeof first.eventId).toBe('string');
    expect(second.eventId).not.toBe(first.eventId);
    expect(redis.publish).toHaveBeenNthCalledWith(
      1,
      'automation-task-events',
      JSON.stringify(first),
    );

    await publisher.onModuleDestroy();
    expect(redis.quit).toHaveBeenCalledTimes(1);
  });

  it('subscribes once and forwards valid events from Redis', async () => {
    let messageListener: (channel: string, message: string) => void = () =>
      undefined;
    const redis = {
      subscribe: jest.fn().mockResolvedValue(1),
      unsubscribe: jest.fn().mockResolvedValue(0),
      on: jest.fn(
        (
          _event: 'message',
          listener: (channel: string, message: string) => void,
        ) => {
          messageListener = listener;
        },
      ),
      off: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    const subscriber = new RedisAutomationTaskEventsSubscriber(
      redis as unknown as RedisPubSubClient,
    );
    await subscriber.onModuleInit();
    const received = firstValueFrom(subscriber.events$);

    messageListener('automation-task-events', JSON.stringify(event));

    await expect(received).resolves.toEqual(event);
    expect(redis.subscribe).toHaveBeenCalledTimes(1);

    await subscriber.onModuleDestroy();
    expect(redis.unsubscribe).toHaveBeenCalledWith('automation-task-events');
    expect(redis.off).toHaveBeenCalledWith('message', messageListener);
    expect(redis.quit).toHaveBeenCalledTimes(1);
  });
});
