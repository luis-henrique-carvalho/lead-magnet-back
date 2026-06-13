import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { Marketplace } from '../../../shared/enums/marketplace.enum';

export class SearchMarketplaceProductsDto {
  @ApiProperty({ enum: Marketplace, example: Marketplace.MercadoLivre })
  @IsEnum(Marketplace)
  marketplace!: Marketplace;

  @ApiPropertyOptional({ example: 'headphone' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  query?: string;

  @ApiPropertyOptional({ example: 'eletronicos' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}
