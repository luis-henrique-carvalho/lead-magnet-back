import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Marketplace } from '../../../shared/enums/marketplace.enum';
import { MarketplaceProduct } from '../providers/marketplace-product-search-provider.interface';

export class MarketplaceProductResponseDto {
  @ApiPropertyOptional()
  externalId?: string;

  @ApiProperty({ enum: Marketplace })
  marketplace!: Marketplace;

  @ApiProperty()
  title!: string;

  @ApiProperty({ format: 'uri' })
  originalUrl!: string;

  @ApiPropertyOptional({ format: 'uri' })
  imageUrl?: string;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional()
  rating?: number;

  @ApiPropertyOptional()
  reviewsCount?: number;

  @ApiPropertyOptional()
  salesCount?: number;

  @ApiPropertyOptional()
  category?: string;

  static fromProduct(
    product: MarketplaceProduct,
  ): MarketplaceProductResponseDto {
    const {
      externalId,
      marketplace,
      title,
      originalUrl,
      imageUrl,
      price,
      rating,
      reviewsCount,
      salesCount,
      category,
    } = product;

    return {
      externalId,
      marketplace,
      title,
      originalUrl,
      imageUrl,
      price,
      rating,
      reviewsCount,
      salesCount,
      category,
    };
  }
}
