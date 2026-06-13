import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AutomationTasksService } from './automation-tasks.service';
import { AutomationTaskResponseDto } from './dto/automation-task-response.dto';

@ApiTags('automation-tasks')
@Controller('automation-tasks')
export class AutomationTasksController {
  constructor(
    private readonly automationTasksService: AutomationTasksService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get the current state of an automation task' })
  @ApiOkResponse({ type: AutomationTaskResponseDto })
  @ApiNotFoundResponse({ description: 'Automation task not found' })
  findOne(@Param('id') id: string): Promise<AutomationTaskResponseDto> {
    return this.automationTasksService.findById(id);
  }
}
