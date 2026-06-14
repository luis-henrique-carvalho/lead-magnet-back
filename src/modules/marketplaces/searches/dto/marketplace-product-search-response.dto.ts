import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Marketplace } from '../../../../shared/enums/marketplace.enum';

export class MarketplaceProductSearchResponseDto {
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
}
