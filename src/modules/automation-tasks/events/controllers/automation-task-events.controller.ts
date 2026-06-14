import { Controller, Get, Req, Res } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
// import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import { Subscription } from 'rxjs';
// import { AutomationTaskEventsAccessGuard } from '../guards/automation-task-events-access.guard';
import {
  AutomationTaskDomainEvent,
  AutomationTaskEventsSubscriber,
} from '../interfaces/automation-task-events.subscriber';

const HEARTBEAT_INTERVAL_MS = 15_000;
const RETRY_INTERVAL_MS = 3_000;

type StreamRequest = {
  once(event: 'close', listener: () => void): unknown;
};

type StreamResponse = {
  set(headers: Record<string, string>): unknown;
  flushHeaders(): void;
  write(chunk: string): unknown;
  end(): void;
};

// type StreamSession = {
//   user: { id: string };
//   session: { expiresAt: Date | string };
// };

@ApiTags('automation-tasks')
@Controller('automation-tasks/events')
export class AutomationTaskEventsController {
  constructor(
    private readonly eventsSubscriber: AutomationTaskEventsSubscriber,
  ) {}

  @Get()
  // @UseGuards(AuthGuard, AutomationTaskEventsAccessGuard)
  @ApiCookieAuth('better-auth.session_token')
  @ApiProduces('text/event-stream')
  @ApiOperation({ summary: 'Stream automation task lifecycle events' })
  stream(
    @Req() request: StreamRequest,
    @Res() response: StreamResponse,
    // @Session() session: StreamSession,
  ): void {
    // void session.user.id;
    response.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();
    response.write(`retry: ${RETRY_INTERVAL_MS}\n\n`);

    console.log('Client connected to automation task events stream');

    const subscription = this.eventsSubscriber.events$.subscribe((event) => {
      response.write(this.serializeEvent(event));
    });
    const heartbeat = setInterval(() => {
      response.write(': heartbeat\n\n');
    }, HEARTBEAT_INTERVAL_MS);
    heartbeat.unref();

    let closed = false;

    const close = () => {
      if (closed) return;
      closed = true;
      // clearTimeout(expiration);
      this.closeStream(subscription, heartbeat, response);
    };
    // const expirationDelay = Math.max(
    //   0,
    //   new Date(session.session.expiresAt).getTime() - Date.now(),
    // );
    // const expiration = setTimeout(close, expirationDelay);
    // expiration.unref();

    request.once('close', close);
  }

  private serializeEvent(event: AutomationTaskDomainEvent): string {
    return `id: ${event.eventId}\nevent: ${event.eventType}\ndata: ${JSON.stringify(event)}\n\n`;
  }

  private closeStream(
    subscription: Subscription,
    heartbeat: NodeJS.Timeout,
    response: StreamResponse,
  ): void {
    clearInterval(heartbeat);
    subscription.unsubscribe();
    response.end();
  }
}
