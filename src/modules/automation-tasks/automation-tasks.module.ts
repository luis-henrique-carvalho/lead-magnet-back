import { Module } from '@nestjs/common';
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

@Module({
  controllers: [
    AutomationTasksController,
    AutomationTaskDependenciesController,
    AutomationTaskAttemptsController,
  ],
  providers: [
    AutomationTasksService,
    AutomationTaskDependenciesService,
    AutomationTaskAttemptsService,
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
  exports: [AutomationTasksService, AutomationTaskDependenciesService],
})
export class AutomationTasksModule {}
