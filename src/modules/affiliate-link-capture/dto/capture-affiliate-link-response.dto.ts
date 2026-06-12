import { ApiProperty } from '@nestjs/swagger';

export class CaptureAffiliateLinkResponseDto {
  @ApiProperty({ format: 'uuid' })
  taskId!: string;

  @ApiProperty({
    example: '/automation-tasks/550e8400-e29b-41d4-a716-446655440000',
  })
  statusUrl!: string;
}
