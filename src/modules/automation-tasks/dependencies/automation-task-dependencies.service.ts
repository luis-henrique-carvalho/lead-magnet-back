import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AddAutomationTaskDependencyResult,
  AutomationTaskDependenciesRepository,
} from './automation-task-dependencies.repository';

@Injectable()
export class AutomationTaskDependenciesService {
  constructor(
    private readonly repository: AutomationTaskDependenciesRepository,
  ) {}

  async add(predecessorId: string, successorId: string): Promise<void> {
    if (predecessorId === successorId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    const result = await this.repository.add(predecessorId, successorId);

    if (result === AddAutomationTaskDependencyResult.TaskNotFound) {
      throw new NotFoundException('Predecessor or successor task not found');
    }

    if (result === AddAutomationTaskDependencyResult.AlreadyExists) {
      throw new ConflictException('Automation task dependency already exists');
    }

    if (result === AddAutomationTaskDependencyResult.CreatesCycle) {
      throw new ConflictException('Automation task dependency creates a cycle');
    }
  }

  findPending(successorId: string) {
    return this.repository.findPending(successorId);
  }

  async findDependencies(successorId: string) {
    const dependencies = await this.repository.findDependencies(successorId);

    if (dependencies === null) {
      throw new NotFoundException('Automation task not found');
    }

    return dependencies;
  }

  async findDependents(predecessorId: string) {
    const dependents = await this.repository.findDependents(predecessorId);

    if (dependents === null) {
      throw new NotFoundException('Automation task not found');
    }

    return dependents;
  }
}
