import { Module } from '@nestjs/common';
import { AutomationTasksController } from './automation-tasks.controller';
import { AutomationTasksRepository } from './automation-tasks.repository';
import { AutomationTasksService } from './automation-tasks.service';
import { PrismaAutomationTasksRepository } from './prisma-automation-tasks.repository';

@Module({
  controllers: [AutomationTasksController],
  providers: [
    AutomationTasksService,
    {
      provide: AutomationTasksRepository,
      useClass: PrismaAutomationTasksRepository,
    },
  ],
  exports: [AutomationTasksService],
})
export class AutomationTasksModule {}
