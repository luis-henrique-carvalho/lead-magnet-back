import { EventEmitter } from 'node:events';
import { Subject } from 'rxjs';

jest.mock('@thallesp/nestjs-better-auth', () => ({
  AuthGuard: class AuthGuard {},
  Session: () => () => undefined,
}));

import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';
import { AutomationTaskEventsController } from './automation-task-events.controller';
import {
  AutomationTaskDomainEvent,
  AutomationTaskEventsSubscriber,
} from './automation-task-events.subscriber';

describe('AutomationTaskEventsController', () => {
  it('opens an SSE stream and forwards typed task events', () => {
    const events = new Subject<AutomationTaskDomainEvent>();
    const subscriber: AutomationTaskEventsSubscriber = {
      events$: events.asObservable(),
    };
    const controller = new AutomationTaskEventsController(subscriber);
    const request = new EventEmitter();
    const response = {
      set: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };

    controller.stream(request, response, {
      user: { id: 'user-id' },
      session: { expiresAt: new Date(Date.now() + 60_000) },
    });
    events.next({
      eventId: 'event-id',
      eventType: 'task.created',
      taskId: 'task-id',
      type: AutomationTaskType.MarketplaceProductSearch,
      status: AutomationTaskStatus.Pending,
      marketplace: 'amazon',
      updatedAt: '2026-06-14T12:00:00.000Z',
    });

    expect(response.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
      }),
    );
    expect(response.write).toHaveBeenNthCalledWith(1, 'retry: 3000\n\n');
    expect(response.write).toHaveBeenNthCalledWith(
      2,
      'id: event-id\nevent: task.created\ndata: {"eventId":"event-id","eventType":"task.created","taskId":"task-id","type":"marketplace_product_search","status":"pending","marketplace":"amazon","updatedAt":"2026-06-14T12:00:00.000Z"}\n\n',
    );
    request.emit('close');
  });

  it('sends heartbeat comments and releases the stream on disconnect', () => {
    jest.useFakeTimers();
    const events = new Subject<AutomationTaskDomainEvent>();
    const controller = new AutomationTaskEventsController({
      events$: events.asObservable(),
    });
    const request = new EventEmitter();
    const response = {
      set: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };

    controller.stream(request, response, {
      user: { id: 'user-id' },
      session: { expiresAt: new Date(Date.now() + 60_000) },
    });
    jest.advanceTimersByTime(15_000);

    expect(response.write).toHaveBeenLastCalledWith(': heartbeat\n\n');

    request.emit('close');
    events.next({
      eventId: 'ignored',
      eventType: 'task.updated',
      taskId: 'task-id',
      type: AutomationTaskType.MarketplaceProductSearch,
      status: AutomationTaskStatus.Completed,
      marketplace: 'amazon',
      updatedAt: '2026-06-14T12:01:00.000Z',
    });
    jest.advanceTimersByTime(30_000);

    expect(response.end).toHaveBeenCalledTimes(1);
    expect(response.write).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('closes the stream when the authenticated session expires', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-14T12:00:00.000Z'));
    const controller = new AutomationTaskEventsController({
      events$: new Subject<AutomationTaskDomainEvent>().asObservable(),
    });
    const request = new EventEmitter();
    const response = {
      set: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };

    controller.stream(request, response, {
      user: { id: 'user-id' },
      session: { expiresAt: new Date('2026-06-14T12:00:01.000Z') },
    });
    jest.advanceTimersByTime(1_000);

    expect(response.end).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
