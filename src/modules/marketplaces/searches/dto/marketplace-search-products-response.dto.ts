import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Marketplace } from '../../../../shared/enums/marketplace.enum';

export class CanonicalMarketplaceProductDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  externalId!: string | null;

  @ApiProperty({ enum: Marketplace })
  marketplace!: Marketplace;

  @ApiProperty()
  title!: string;

  @ApiProperty({ format: 'uri' })
  originalUrl!: string;

  @ApiPropertyOptional({ format: 'uri', nullable: true })
  imageUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  price!: number | null;

  @ApiPropertyOptional({ nullable: true })
  rating!: number | null;

  @ApiPropertyOptional({ nullable: true })
  reviewsCount!: number | null;

  @ApiPropertyOptional({ nullable: true })
  salesCount!: number | null;

  @ApiPropertyOptional({ nullable: true })
  category!: string | null;
}

export class MarketplaceSearchProductItemDto {
  @ApiProperty({ format: 'uuid' })
  resultId!: string;

  @ApiProperty({ format: 'date-time' })
  discoveredAt!: Date;

  @ApiProperty({ type: CanonicalMarketplaceProductDto })
  product!: CanonicalMarketplaceProductDto;
}

export class MarketplaceSearchProductsResponseDto {
  @ApiProperty({ type: MarketplaceSearchProductItemDto, isArray: true })
  items!: MarketplaceSearchProductItemDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
