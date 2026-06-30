import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Marketplace } from '../../../../shared/enums/marketplace.enum';
import { AutomationTaskStatus } from '../../../../shared/enums/automation-task-status.enum';
import { AutomationErrorType } from '../../../../shared/enums/automation-error-type.enum';

export class AutomationTaskSummaryDto {
  @ApiProperty({ enum: AutomationTaskStatus })
  status!: AutomationTaskStatus;

  @ApiPropertyOptional({ nullable: true })
  error!: string | null;

  @ApiPropertyOptional({ enum: AutomationErrorType, nullable: true })
  errorType!: AutomationErrorType | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  startedAt!: Date | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  finishedAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class MarketplaceProductSearchHistoryItemDto {
  @ApiProperty({ format: 'uuid' })
  searchId!: string;

  @ApiProperty({ format: 'uuid' })
  taskId!: string;

  @ApiProperty({ enum: Marketplace })
  marketplace!: Marketplace;

  @ApiPropertyOptional({ nullable: true })
  query!: string | null;

  @ApiPropertyOptional({ nullable: true })
  category!: string | null;

  @ApiProperty()
  requestedLimit!: number;

  @ApiProperty()
  foundCount!: number;

  @ApiProperty()
  savedCount!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ type: AutomationTaskSummaryDto })
  task!: AutomationTaskSummaryDto;
}

export class MarketplaceProductSearchHistoryResponseDto {
  @ApiProperty({ type: MarketplaceProductSearchHistoryItemDto, isArray: true })
  items!: MarketplaceProductSearchHistoryItemDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
