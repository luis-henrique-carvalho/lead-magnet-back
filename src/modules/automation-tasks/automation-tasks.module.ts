import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AutomationTasksController } from './automation-tasks.controller';
import { AutomationTasksRepository } from './automation-tasks.repository';
import { AutomationTasksService } from './automation-tasks.service';
import { PrismaAutomationTasksRepository } from './prisma-automation-tasks.repository';
import { AutomationTaskDependenciesController } from './dependencies/automation-task-dependencies.controller';
import { AutomationTaskDependenciesRepository } from './dependencies/automation-task-dependencies.repository';
import { AutomationTaskDependenciesService } from './dependencies/automation-task-dependencies.service';
import { PrismaAutomationTaskDependenciesRepository } from './dependencies/prisma-automation-task-dependencies.repository';
import { AutomationTaskAttemptsController } from './attempts/automation-task-attempts.controller';
import { AutomationTaskAttemptsRepository } from './attempts/automation-task-attempts.repository';
import { AutomationTaskAttemptsService } from './attempts/automation-task-attempts.service';
import { PrismaAutomationTaskAttemptsRepository } from './attempts/prisma-automation-task-attempts.repository';
import { AutomationTaskEventsAccessGuard } from './events/automation-task-events-access.guard';
import { AutomationTaskEventsAccessPolicy } from './events/automation-task-events-access.policy';
import { AutomationTaskEventsAccessService } from './events/automation-task-events-access.service';
import { AutomationTaskEventsController } from './events/automation-task-events.controller';
import { AutomationTaskEventsPublisher } from './events/automation-task-events.publisher';
import { AutomationTaskEventsSubscriber } from './events/automation-task-events.subscriber';
import {
  AUTOMATION_TASK_EVENTS_REDIS_PUBLISHER,
  AUTOMATION_TASK_EVENTS_REDIS_SUBSCRIBER,
  RedisPubSubClient,
} from './events/redis-pub-sub-client';
import { RedisAutomationTaskEventsPublisher } from './events/redis-automation-task-events.publisher';
import { RedisAutomationTaskEventsSubscriber } from './events/redis-automation-task-events.subscriber';

const DEFAULT_REDIS_PORT = 6379;

function createRedisClient(configService: ConfigService): RedisPubSubClient {
  const configuredPort = Number(configService.get<string>('REDIS_PORT'));
  const port =
    Number.isInteger(configuredPort) &&
    configuredPort > 0 &&
    configuredPort <= 65535
      ? configuredPort
      : DEFAULT_REDIS_PORT;

  return new Redis({
    host: configService.get('REDIS_HOST', 'localhost'),
    port,
  });
}

@Module({
  controllers: [
    AutomationTaskEventsController,
    AutomationTasksController,
    AutomationTaskDependenciesController,
    AutomationTaskAttemptsController,
  ],
  providers: [
    AutomationTasksService,
    AutomationTaskDependenciesService,
    AutomationTaskAttemptsService,
    AutomationTaskEventsAccessGuard,
    AutomationTaskEventsAccessService,
    RedisAutomationTaskEventsPublisher,
    RedisAutomationTaskEventsSubscriber,
    {
      provide: AutomationTaskEventsAccessPolicy,
      useExisting: AutomationTaskEventsAccessService,
    },
    {
      provide: AutomationTaskEventsPublisher,
      useExisting: RedisAutomationTaskEventsPublisher,
    },
    {
      provide: AutomationTaskEventsSubscriber,
      useExisting: RedisAutomationTaskEventsSubscriber,
    },
    {
      provide: AUTOMATION_TASK_EVENTS_REDIS_PUBLISHER,
      inject: [ConfigService],
      useFactory: createRedisClient,
    },
    {
      provide: AUTOMATION_TASK_EVENTS_REDIS_SUBSCRIBER,
      inject: [ConfigService],
      useFactory: createRedisClient,
    },
    {
      provide: AutomationTasksRepository,
      useClass: PrismaAutomationTasksRepository,
    },
    {
      provide: AutomationTaskDependenciesRepository,
      useClass: PrismaAutomationTaskDependenciesRepository,
    },
    {
      provide: AutomationTaskAttemptsRepository,
      useClass: PrismaAutomationTaskAttemptsRepository,
    },
  ],
  exports: [
    AutomationTasksService,
    AutomationTaskDependenciesService,
    AutomationTaskEventsPublisher,
  ],
})
export class AutomationTasksModule {}
