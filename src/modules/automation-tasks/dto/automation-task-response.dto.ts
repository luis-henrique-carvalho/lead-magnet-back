import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';
import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';
import { AutomationTask } from '../automation-task.types';

export class AutomationTaskResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AutomationTaskType })
  type!: AutomationTaskType;

  @ApiPropertyOptional({ nullable: true })
  marketplace!: string | null;

  @ApiProperty({ enum: AutomationTaskStatus })
  status!: AutomationTaskStatus;

  @ApiProperty()
  statusUrl!: string;

  @ApiPropertyOptional({ type: Object, nullable: true })
  result!: unknown;

  @ApiPropertyOptional({ nullable: true })
  error!: string | null;

  @ApiPropertyOptional({ enum: AutomationErrorType, nullable: true })
  errorType!: AutomationErrorType | null;

  @ApiProperty()
  attempts!: number;

  @ApiPropertyOptional({ nullable: true })
  startedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  finishedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromTask(task: AutomationTask): AutomationTaskResponseDto {
    return {
      ...task,
      statusUrl: `/automation-tasks/${task.id}`,
    };
  }
}
