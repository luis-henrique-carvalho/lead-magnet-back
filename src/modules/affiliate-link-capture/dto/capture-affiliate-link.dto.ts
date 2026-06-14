import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUrl, IsUUID, MaxLength } from 'class-validator';

import { Marketplace } from '../../../shared/enums/marketplace.enum';

export class CaptureAffiliateLinkDto {
  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  searchId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ enum: Marketplace, example: Marketplace.MercadoLivre })
  @IsEnum(Marketplace)
  marketplace!: Marketplace;

  @ApiProperty({ example: 'https://produto.mercadolivre.com.br/MLB-123' })
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
  })
  @MaxLength(2048)
  originalProductUrl!: string;
}
