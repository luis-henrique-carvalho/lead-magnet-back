import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AutomationTaskStatus } from '../../../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../../../shared/enums/automation-task-type.enum';
import { Marketplace } from '../../../../shared/enums/marketplace.enum';

export class MarketplaceSearchResultOriginSearchDto {
  @ApiProperty({ format: 'uuid' })
  searchId!: string;

  @ApiProperty({ enum: Marketplace })
  marketplace!: Marketplace;

  @ApiPropertyOptional({ nullable: true })
  query!: string | null;

  @ApiPropertyOptional({ nullable: true })
  category!: string | null;
}

export class MarketplaceSearchResultOriginTaskDto {
  @ApiProperty({ format: 'uuid' })
  taskId!: string;

  @ApiProperty({ enum: AutomationTaskType })
  type!: AutomationTaskType;

  @ApiProperty({ enum: AutomationTaskStatus })
  status!: AutomationTaskStatus;

  @ApiPropertyOptional({ nullable: true })
  marketplace!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  finishedAt!: Date | null;
}

export class MarketplaceSearchResultOriginTaskResponseDto {
  @ApiProperty({ format: 'uuid' })
  resultId!: string;

  @ApiProperty({ type: MarketplaceSearchResultOriginSearchDto })
  search!: MarketplaceSearchResultOriginSearchDto;

  @ApiProperty({ type: MarketplaceSearchResultOriginTaskDto })
  task!: MarketplaceSearchResultOriginTaskDto;
}
