import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../infra/database/prisma/generated/prisma/client';
import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';
import {
  AddAutomationTaskDependencyResult,
  AutomationTaskDependencyNavigation,
  AutomationTaskDependenciesRepository,
  PendingAutomationTaskDependency,
} from './automation-task-dependencies.repository';
import { AutomationTaskDependencyDirection } from './dto/automation-task-dependency-response.dto';

const DEPENDENCY_GRAPH_LOCK_ID = 1_846_273_951;

@Injectable()
export class PrismaAutomationTaskDependenciesRepository implements AutomationTaskDependenciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  add(
    predecessorId: string,
    successorId: string,
  ): Promise<AddAutomationTaskDependencyResult> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${DEPENDENCY_GRAPH_LOCK_ID}::bigint)`;

      const tasks = await transaction.automationTask.findMany({
        where: { id: { in: [predecessorId, successorId] } },
        select: { id: true },
      });

      if (tasks.length !== 2) {
        return AddAutomationTaskDependencyResult.TaskNotFound;
      }

      const dependency = await transaction.automationTaskDependency.findUnique({
        where: { predecessorId_successorId: { predecessorId, successorId } },
        select: { id: true },
      });

      if (dependency) {
        return AddAutomationTaskDependencyResult.AlreadyExists;
      }

      if (await this.hasPath(transaction, successorId, predecessorId)) {
        return AddAutomationTaskDependencyResult.CreatesCycle;
      }

      await transaction.automationTaskDependency.create({
        data: { predecessorId, successorId },
      });

      return AddAutomationTaskDependencyResult.Created;
    });
  }

  private async hasPath(
    transaction: Prisma.TransactionClient,
    fromTaskId: string,
    toTaskId: string,
  ): Promise<boolean> {
    const visited = new Set<string>();
    let frontier = [fromTaskId];

    while (frontier.length > 0) {
      if (frontier.includes(toTaskId)) return true;

      frontier.forEach((taskId) => visited.add(taskId));
      const links = await transaction.automationTaskDependency.findMany({
        where: {
          predecessorId: { in: frontier },
          successorId: { notIn: [...visited] },
        },
        select: { successorId: true },
      });
      frontier = [...new Set(links.map((link) => link.successorId))];
    }

    return false;
  }

  async findPending(
    successorId: string,
  ): Promise<PendingAutomationTaskDependency[]> {
    const dependencies = await this.prisma.automationTaskDependency.findMany({
      where: {
        successorId,
        required: true,
        predecessor: { status: { not: AutomationTaskStatus.Completed } },
      },
      select: {
        predecessorId: true,
        predecessor: { select: { status: true } },
      },
    });

    return dependencies.map((dependency) => ({
      predecessorId: dependency.predecessorId,
      status: dependency.predecessor.status as AutomationTaskStatus,
    }));
  }

  async findDependencies(
    successorId: string,
  ): Promise<AutomationTaskDependencyNavigation[] | null> {
    const task = await this.prisma.automationTask.findUnique({
      where: { id: successorId },
      select: {
        successorLinks: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            required: true,
            createdAt: true,
            predecessor: {
              select: { id: true, type: true, status: true },
            },
          },
        },
      },
    });

    if (!task) return null;

    return task.successorLinks.map((link) => ({
      taskId: link.predecessor.id,
      type: link.predecessor.type as AutomationTaskDependencyNavigation['type'],
      status: link.predecessor
        .status as AutomationTaskDependencyNavigation['status'],
      direction: AutomationTaskDependencyDirection.Predecessor,
      required: link.required,
      createdAt: link.createdAt,
    }));
  }

  async findDependents(
    predecessorId: string,
  ): Promise<AutomationTaskDependencyNavigation[] | null> {
    const task = await this.prisma.automationTask.findUnique({
      where: { id: predecessorId },
      select: {
        predecessorLinks: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            required: true,
            createdAt: true,
            successor: {
              select: { id: true, type: true, status: true },
            },
          },
        },
      },
    });

    if (!task) return null;

    return task.predecessorLinks.map((link) => ({
      taskId: link.successor.id,
      type: link.successor.type as AutomationTaskDependencyNavigation['type'],
      status: link.successor
        .status as AutomationTaskDependencyNavigation['status'],
      direction: AutomationTaskDependencyDirection.Successor,
      required: link.required,
      createdAt: link.createdAt,
    }));
  }
}
