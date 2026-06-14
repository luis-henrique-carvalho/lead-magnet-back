import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateAutomationTaskDependencyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  predecessorTaskId!: string;
}
