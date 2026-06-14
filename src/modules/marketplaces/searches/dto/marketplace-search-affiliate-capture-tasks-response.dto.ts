import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AutomationTaskStatus } from '../../../../shared/enums/automation-task-status.enum';
import { Marketplace } from '../../../../shared/enums/marketplace.enum';

export class MarketplaceSearchAffiliateCaptureTaskDto {
  @ApiProperty({ format: 'uuid' })
  taskId!: string;

  @ApiProperty({ enum: AutomationTaskStatus })
  status!: AutomationTaskStatus;

  @ApiPropertyOptional({ enum: Marketplace, nullable: true })
  marketplace!: Marketplace | null;

  @ApiPropertyOptional({ nullable: true })
  productId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  productTitle!: string | null;

  @ApiPropertyOptional({ format: 'uri', nullable: true })
  originalProductUrl!: string | null;

  @ApiPropertyOptional({ format: 'uri', nullable: true })
  capturedAffiliateUrl!: string | null;

  @ApiProperty({ format: 'date-time' })
  taskCreatedAt!: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  startedAt!: Date | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  finishedAt!: Date | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  capturedAt!: Date | null;
}

export class MarketplaceSearchAffiliateCaptureTasksResponseDto {
  @ApiProperty({
    type: MarketplaceSearchAffiliateCaptureTaskDto,
    isArray: true,
  })
  items!: MarketplaceSearchAffiliateCaptureTaskDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
