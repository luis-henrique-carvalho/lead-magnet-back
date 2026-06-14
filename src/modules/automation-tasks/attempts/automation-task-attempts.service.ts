import { Injectable, NotFoundException } from '@nestjs/common';

import {
  AutomationTaskAttemptsPagination,
  AutomationTaskAttemptsRepository,
} from './automation-task-attempts.repository';

@Injectable()
export class AutomationTaskAttemptsService {
  constructor(private readonly repository: AutomationTaskAttemptsRepository) {}

  async findByTaskId(
    taskId: string,
    pagination: AutomationTaskAttemptsPagination,
  ) {
    const attempts = await this.repository.findByTaskId(taskId, pagination);

    if (!attempts) {
      throw new NotFoundException('Automation task not found');
    }

    return attempts;
  }
}
