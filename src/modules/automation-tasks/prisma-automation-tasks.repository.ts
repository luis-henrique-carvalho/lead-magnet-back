import { Injectable } from '@nestjs/common';
import { Prisma } from '../../infra/database/prisma/generated/prisma/client';
import { PrismaService } from '../../infra/database/prisma/prisma.service';
import {
  AutomationTask,
  CreateAutomationTaskInput,
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
    }) as Promise<AutomationTask | null>;
  }

  async update(
    id: string,
    input: UpdateAutomationTaskInput,
  ): Promise<AutomationTask | null> {
    const { incrementAttempts, ...data } = input;
    const updateData: Prisma.AutomationTaskUpdateManyMutationInput = {
      ...data,
      result: this.toJsonInput(data.result),
      attempts: incrementAttempts ? { increment: 1 } : undefined,
    };

    const result = await this.prisma.automationTask.updateMany({
      where: { id },
      data: updateData,
    });

    if (result.count === 0) {
      return null;
    }

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
