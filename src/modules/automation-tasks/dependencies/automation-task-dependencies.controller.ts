import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AutomationTaskDependenciesService } from './automation-task-dependencies.service';
import { CreateAutomationTaskDependencyDto } from './dto/create-automation-task-dependency.dto';

@ApiTags('automation-tasks')
@Controller('automation-tasks/:id/dependencies')
export class AutomationTaskDependenciesController {
  constructor(
    private readonly dependenciesService: AutomationTaskDependenciesService,
  ) {}

  @Post()
  @HttpCode(204)
  @ApiOperation({ summary: 'Add a dependency to an automation task' })
  async add(
    @Param('id') successorId: string,
    @Body() input: CreateAutomationTaskDependencyDto,
  ): Promise<void> {
    await this.dependenciesService.add(input.predecessorTaskId, successorId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'List pending dependencies of an automation task' })
  findPending(@Param('id') successorId: string) {
    return this.dependenciesService.findPending(successorId);
  }
}
