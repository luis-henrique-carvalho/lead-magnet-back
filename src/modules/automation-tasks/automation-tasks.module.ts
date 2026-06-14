import { Module } from '@nestjs/common';
import { AutomationTasksController } from './automation-tasks.controller';
import { AutomationTasksRepository } from './automation-tasks.repository';
import { AutomationTasksService } from './automation-tasks.service';
import { PrismaAutomationTasksRepository } from './prisma-automation-tasks.repository';
import { AutomationTaskDependenciesController } from './dependencies/automation-task-dependencies.controller';
import { AutomationTaskDependenciesRepository } from './dependencies/automation-task-dependencies.repository';
import { AutomationTaskDependenciesService } from './dependencies/automation-task-dependencies.service';
import { PrismaAutomationTaskDependenciesRepository } from './dependencies/prisma-automation-task-dependencies.repository';

@Module({
  controllers: [
    AutomationTasksController,
    AutomationTaskDependenciesController,
  ],
  providers: [
    AutomationTasksService,
    AutomationTaskDependenciesService,
    {
      provide: AutomationTasksRepository,
      useClass: PrismaAutomationTasksRepository,
    },
    {
      provide: AutomationTaskDependenciesRepository,
      useClass: PrismaAutomationTaskDependenciesRepository,
    },
  ],
  exports: [AutomationTasksService],
})
export class AutomationTasksModule {}
