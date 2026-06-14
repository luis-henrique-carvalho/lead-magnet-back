import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AutomationErrorType } from '../../../../shared/enums/automation-error-type.enum';
import { AutomationTaskStatus } from '../../../../shared/enums/automation-task-status.enum';

export class AutomationTaskAttemptResponseDto {
  @ApiProperty()
  number!: number;

  @ApiProperty()
  jobId!: string;

  @ApiProperty({ enum: AutomationTaskStatus })
  status!: AutomationTaskStatus;

  @ApiPropertyOptional({ nullable: true })
  error!: string | null;

  @ApiPropertyOptional({ enum: AutomationErrorType, nullable: true })
  errorType!: AutomationErrorType | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata!: unknown;

  @ApiProperty({ format: 'date-time' })
  startedAt!: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  finishedAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class AutomationTaskAttemptsResponseDto {
  @ApiProperty({ type: AutomationTaskAttemptResponseDto, isArray: true })
  items!: AutomationTaskAttemptResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
