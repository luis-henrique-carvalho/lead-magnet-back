import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AutomationTaskAttemptsService } from './automation-task-attempts.service';
import { AutomationTaskAttemptsQueryDto } from './dto/automation-task-attempts-query.dto';
import { AutomationTaskAttemptsResponseDto } from './dto/automation-task-attempts-response.dto';

@ApiTags('automation-tasks')
@Controller('automation-tasks/:taskId/attempts')
export class AutomationTaskAttemptsController {
  constructor(
    private readonly attemptsService: AutomationTaskAttemptsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the attempt history of an automation task' })
  @ApiOkResponse({ type: AutomationTaskAttemptsResponseDto })
  findByTaskId(
    @Param('taskId') taskId: string,
    @Query() pagination: AutomationTaskAttemptsQueryDto,
  ) {
    return this.attemptsService.findByTaskId(taskId, pagination);
  }
}
