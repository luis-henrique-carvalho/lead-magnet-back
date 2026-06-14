import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { AutomationErrorType } from '../../shared/enums/automation-error-type.enum';
import { AutomationTaskStatus } from '../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../shared/enums/automation-task-type.enum';
import {
  AutomationTask,
  CreateAutomationTaskInput,
  UpdateAutomationTaskInput,
} from './automation-task.types';
import { AutomationTasksRepository } from './automation-tasks.repository';
import { AutomationTaskResponseDto } from './dto/automation-task-response.dto';
import { AutomationTaskEventsPublisher } from './events/interfaces/automation-task-events.publisher';

@Injectable()
export class AutomationTasksService {
  private readonly logger = new Logger(AutomationTasksService.name);

  constructor(
    private readonly repository: AutomationTasksRepository,
    private readonly eventsPublisher: AutomationTaskEventsPublisher,
  ) {}

  async create(input: CreateAutomationTaskInput): Promise<AutomationTask> {
    return this.repository.create(input);
  }

  async findById(taskId: string): Promise<AutomationTaskResponseDto> {
    const task = await this.getTask(taskId);

    return AutomationTaskResponseDto.fromTask(task);
  }

  async markProcessing(
    taskId: string,
    jobId: string,
    metadata?: unknown,
  ): Promise<AutomationTask> {
    const task = await this.repository.startAttempt(taskId, {
      jobId,
      metadata,
    });

    if (!task) {
      throw new NotFoundException(`Automation task not found: ${taskId}`);
    }

    await this.publishUpdate(task);

    return task;
  }

  async markCompleted(
    taskId: string,
    jobId: string,
    result: unknown,
  ): Promise<AutomationTask> {
    return this.finishAttempt(taskId, jobId, {
      status: AutomationTaskStatus.Completed,
      result,
      error: null,
      errorType: null,
      finishedAt: new Date(),
    });
  }

  async markPartial(
    taskId: string,
    jobId: string,
    result: unknown,
    error?: string,
  ): Promise<AutomationTask> {
    return this.finishAttempt(taskId, jobId, {
      status: AutomationTaskStatus.Partial,
      result,
      error: error ?? null,
      errorType: null,
      finishedAt: new Date(),
    });
  }

  async markFailed(
    taskId: string,
    jobId: string,
    error: string,
    errorType: AutomationErrorType,
  ): Promise<AutomationTask> {
    return this.finishAttempt(taskId, jobId, {
      status: AutomationTaskStatus.Failed,
      result: null,
      error,
      errorType,
      finishedAt: new Date(),
    });
  }

  async markManualRequired(
    taskId: string,
    jobId: string,
    error: string,
    errorType: AutomationErrorType = AutomationErrorType.ManualRequired,
  ): Promise<AutomationTask> {
    return this.finishAttempt(taskId, jobId, {
      status: AutomationTaskStatus.ManualRequired,
      error,
      errorType,
      finishedAt: new Date(),
    });
  }

  private async getTask(taskId: string): Promise<AutomationTask> {
    const task = await this.repository.findById(taskId);

    if (!task) {
      throw new NotFoundException(`Automation task not found: ${taskId}`);
    }

    return task;
  }

  private async finishAttempt(
    taskId: string,
    jobId: string,
    input: UpdateAutomationTaskInput,
  ): Promise<AutomationTask> {
    const task = await this.repository.finishAttempt(taskId, jobId, input);

    if (!task) {
      throw new NotFoundException(`Automation task not found: ${taskId}`);
    }

    await this.publishUpdate(task);

    return task;
  }

  private async publishUpdate(task: AutomationTask): Promise<void> {
    if (
      task.type !== AutomationTaskType.MarketplaceProductSearch &&
      task.type !== AutomationTaskType.AffiliateLinkCapture
    ) {
      return;
    }

    try {
      let searchId: string | null = null;
      let productId: string | null = null;

      if (task.type === AutomationTaskType.MarketplaceProductSearch) {
        searchId = task.marketplaceSearch?.id ?? null;
      } else if (task.type === AutomationTaskType.AffiliateLinkCapture) {
        searchId =
          task.successorLinks?.[0]?.predecessor?.marketplaceSearch?.id ?? null;
        productId = task.affiliateLinkCapture?.sourceProductId ?? null;
        if (!productId && task.attemptsHistory?.length) {
          const latestAttempt =
            task.attemptsHistory[task.attemptsHistory.length - 1];
          if (
            latestAttempt.metadata &&
            typeof latestAttempt.metadata === 'object'
          ) {
            productId = (latestAttempt.metadata as any).productId ?? null;
          }
        }
      }

      await this.eventsPublisher.publish('task.updated', {
        id: task.id,
        type: task.type,
        status: task.status,
        marketplace: task.marketplace,
        updatedAt: task.updatedAt,
        ...(searchId ? { searchId } : {}),
        ...(productId ? { productId } : {}),
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish task.updated event for task ${task.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
