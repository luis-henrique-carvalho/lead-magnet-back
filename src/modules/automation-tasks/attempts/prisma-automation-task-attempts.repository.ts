import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import {
  AutomationTaskAttemptHistoryItem,
  AutomationTaskAttemptsPagination,
  AutomationTaskAttemptsRepository,
  PaginatedAutomationTaskAttempts,
} from './automation-task-attempts.repository';

@Injectable()
export class PrismaAutomationTaskAttemptsRepository implements AutomationTaskAttemptsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTaskId(
    taskId: string,
    pagination: AutomationTaskAttemptsPagination,
  ): Promise<PaginatedAutomationTaskAttempts | null> {
    const task = await this.prisma.automationTask.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) return null;

    const where = { taskId };
    const [total, attempts] = await this.prisma.$transaction([
      this.prisma.automationTaskAttempt.count({ where }),
      this.prisma.automationTaskAttempt.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: [{ startedAt: 'desc' }, { number: 'desc' }],
        select: {
          number: true,
          jobId: true,
          status: true,
          error: true,
          errorType: true,
          metadata: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      items: attempts as AutomationTaskAttemptHistoryItem[],
      ...pagination,
      total,
    };
  }
}
