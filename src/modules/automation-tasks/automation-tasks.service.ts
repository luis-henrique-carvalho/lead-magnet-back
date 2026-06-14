import { Injectable, NotFoundException } from '@nestjs/common';
import { AutomationErrorType } from '../../shared/enums/automation-error-type.enum';
import { AutomationTaskStatus } from '../../shared/enums/automation-task-status.enum';
import {
  AutomationTask,
  CreateAutomationTaskInput,
  UpdateAutomationTaskInput,
} from './automation-task.types';
import { AutomationTasksRepository } from './automation-tasks.repository';
import { AutomationTaskResponseDto } from './dto/automation-task-response.dto';

@Injectable()
export class AutomationTasksService {
  constructor(private readonly repository: AutomationTasksRepository) {}

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

    return task;
  }
}
