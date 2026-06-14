import { ApiProperty } from '@nestjs/swagger';

import { AutomationTaskStatus } from '../../../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../../../shared/enums/automation-task-type.enum';

export enum AutomationTaskDependencyDirection {
  Predecessor = 'predecessor',
  Successor = 'successor',
}

export class AutomationTaskDependencyResponseDto {
  @ApiProperty({ format: 'uuid' })
  taskId!: string;

  @ApiProperty({ enum: AutomationTaskType })
  type!: AutomationTaskType;

  @ApiProperty({ enum: AutomationTaskStatus })
  status!: AutomationTaskStatus;

  @ApiProperty({ enum: AutomationTaskDependencyDirection })
  direction!: AutomationTaskDependencyDirection;

  @ApiProperty()
  required!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
