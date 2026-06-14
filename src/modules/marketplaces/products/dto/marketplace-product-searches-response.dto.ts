import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Marketplace } from '../../../../shared/enums/marketplace.enum';

export class MarketplaceProductSearchOccurrenceDto {
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

  @ApiProperty({ format: 'date-time' })
  discoveredAt!: Date;
}

export class MarketplaceProductSearchesResponseDto {
  @ApiProperty({ type: MarketplaceProductSearchOccurrenceDto, isArray: true })
  items!: MarketplaceProductSearchOccurrenceDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({
    example: true,
    description:
      'Legacy results without a relational searchId are not inferred or returned.',
  })
  legacyAssociationsExcluded!: true;
}
