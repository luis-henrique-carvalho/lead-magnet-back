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

  async markProcessing(taskId: string): Promise<AutomationTask> {
    return this.updateTask(taskId, {
      status: AutomationTaskStatus.Processing,
      startedAt: new Date(),
      finishedAt: null,
      error: null,
      errorType: null,
      incrementAttempts: true,
    });
  }

  async markCompleted(
    taskId: string,
    result: unknown,
  ): Promise<AutomationTask> {
    return this.updateTask(taskId, {
      status: AutomationTaskStatus.Completed,
      result,
      error: null,
      errorType: null,
      finishedAt: new Date(),
    });
  }

  async markPartial(
    taskId: string,
    result: unknown,
    error?: string,
  ): Promise<AutomationTask> {
    return this.updateTask(taskId, {
      status: AutomationTaskStatus.Partial,
      result,
      error: error ?? null,
      errorType: null,
      finishedAt: new Date(),
    });
  }

  async markFailed(
    taskId: string,
    error: string,
    errorType: AutomationErrorType,
  ): Promise<AutomationTask> {
    return this.updateTask(taskId, {
      status: AutomationTaskStatus.Failed,
      result: null,
      error,
      errorType,
      finishedAt: new Date(),
    });
  }

  async markManualRequired(
    taskId: string,
    error: string,
    errorType: AutomationErrorType = AutomationErrorType.ManualRequired,
  ): Promise<AutomationTask> {
    return this.updateTask(taskId, {
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

  private async updateTask(
    taskId: string,
    input: UpdateAutomationTaskInput,
  ): Promise<AutomationTask> {
    const task = await this.repository.update(taskId, input);

    if (!task) {
      throw new NotFoundException(`Automation task not found: ${taskId}`);
    }

    return task;
  }
}
