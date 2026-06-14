import { Injectable } from '@nestjs/common';
import { Prisma } from '../../infra/database/prisma/generated/prisma/client';
import { PrismaService } from '../../infra/database/prisma/prisma.service';
import {
  AutomationTask,
  CreateAutomationTaskInput,
  StartAutomationTaskAttemptInput,
  UpdateAutomationTaskInput,
} from './automation-task.types';
import { AutomationTasksRepository } from './automation-tasks.repository';

@Injectable()
export class PrismaAutomationTasksRepository implements AutomationTasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAutomationTaskInput): Promise<AutomationTask> {
    return this.prisma.automationTask.create({
      data: input,
    }) as Promise<AutomationTask>;
  }

  async findById(id: string): Promise<AutomationTask | null> {
    return this.prisma.automationTask.findUnique({
      where: { id },
      include: {
        attemptsHistory: { orderBy: { number: 'asc' } },
        marketplaceSearch: {
          include: {
            results: {
              orderBy: { discoveredAt: 'asc' },
              include: { product: true },
            },
          },
        },
        affiliateLinkCapture: true,
        successorLinks: {
          include: {
            predecessor: { select: { id: true, status: true, type: true } },
          },
        },
      },
    }) as Promise<AutomationTask | null>;
  }

  async startAttempt(
    id: string,
    input: StartAutomationTaskAttemptInput,
  ): Promise<AutomationTask | null> {
    const startedAt = new Date();
    const exists = await this.prisma.automationTask.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) return null;

    await this.prisma.$transaction(async (transaction) => {
      const task = await transaction.automationTask.update({
        where: { id },
        data: {
          status: 'processing',
          startedAt,
          finishedAt: null,
          error: null,
          errorType: null,
          attempts: { increment: 1 },
        },
        select: { attempts: true },
      });

      await transaction.automationTaskAttempt.create({
        data: {
          taskId: id,
          number: task.attempts,
          jobId: input.jobId,
          metadata: this.toJsonInput(input.metadata),
          startedAt,
        },
      });
    });

    return this.findById(id);
  }

  async finishAttempt(
    id: string,
    jobId: string,
    input: UpdateAutomationTaskInput,
  ): Promise<AutomationTask | null> {
    const attempt = await this.prisma.automationTaskAttempt.findFirst({
      where: { taskId: id, jobId, finishedAt: null },
      orderBy: { number: 'desc' },
      select: { id: true },
    });

    if (!attempt) return null;

    await this.prisma.$transaction([
      this.prisma.automationTask.update({
        where: { id },
        data: {
          ...input,
          result: this.toJsonInput(input.result),
        },
      }),
      this.prisma.automationTaskAttempt.update({
        where: { id: attempt.id },
        data: {
          status: input.status,
          error: input.error,
          errorType: input.errorType,
          finishedAt: input.finishedAt,
        },
      }),
    ]);

    return this.findById(id);
  }

  private toJsonInput(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.DbNull;
    }

    return value;
  }
}
