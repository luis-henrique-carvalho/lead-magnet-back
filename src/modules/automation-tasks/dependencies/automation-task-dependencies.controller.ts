import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AutomationTaskDependenciesService } from './automation-task-dependencies.service';
import { CreateAutomationTaskDependencyDto } from './dto/create-automation-task-dependency.dto';
import { AutomationTaskDependencyResponseDto } from './dto/automation-task-dependency-response.dto';

@ApiTags('automation-tasks')
@Controller('automation-tasks/:id')
export class AutomationTaskDependenciesController {
  constructor(
    private readonly dependenciesService: AutomationTaskDependenciesService,
  ) {}

  @Post('dependencies')
  @HttpCode(204)
  @ApiOperation({ summary: 'Add a dependency to an automation task' })
  async add(
    @Param('id') successorId: string,
    @Body() input: CreateAutomationTaskDependencyDto,
  ): Promise<void> {
    await this.dependenciesService.add(input.predecessorTaskId, successorId);
  }

  @Get('dependencies/pending')
  @ApiOperation({ summary: 'List pending dependencies of an automation task' })
  findPending(@Param('id') successorId: string) {
    return this.dependenciesService.findPending(successorId);
  }

  @Get('dependencies')
  @ApiOperation({ summary: 'List all predecessors of an automation task' })
  @ApiOkResponse({ type: AutomationTaskDependencyResponseDto, isArray: true })
  findDependencies(@Param('id') successorId: string) {
    return this.dependenciesService.findDependencies(successorId);
  }

  @Get('dependents')
  @ApiOperation({ summary: 'List all successors of an automation task' })
  @ApiOkResponse({ type: AutomationTaskDependencyResponseDto, isArray: true })
  findDependents(@Param('id') predecessorId: string) {
    return this.dependenciesService.findDependents(predecessorId);
  }
}
