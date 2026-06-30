import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../dto/pagination-query.dto';
import { Marketplace } from '../../../../shared/enums/marketplace.enum';
import { AutomationTaskStatus } from '../../../../shared/enums/automation-task-status.enum';

export class MarketplaceSearchHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'headphone' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  query?: string;

  @ApiPropertyOptional({ enum: Marketplace, example: Marketplace.MercadoLivre })
  @IsOptional()
  @IsEnum(Marketplace)
  marketplace?: Marketplace;

  @ApiPropertyOptional({
    enum: AutomationTaskStatus,
    example: AutomationTaskStatus.Completed,
  })
  @IsOptional()
  @IsEnum(AutomationTaskStatus)
  status?: AutomationTaskStatus;
}
