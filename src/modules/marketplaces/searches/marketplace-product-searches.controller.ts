import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { MarketplaceProductSearchResponseDto } from './dto/marketplace-product-search-response.dto';
import { MarketplaceSearchProductsResponseDto } from './dto/marketplace-search-products-response.dto';
import { MarketplaceProductSearchesService } from './marketplace-product-searches.service';

@ApiTags('marketplace-searches')
@Controller('marketplace-searches')
export class MarketplaceProductSearchesController {
  constructor(
    private readonly searchesService: MarketplaceProductSearchesService,
  ) {}

  @Get(':searchId')
  @ApiOperation({ summary: 'Get a marketplace product search' })
  @ApiOkResponse({ type: MarketplaceProductSearchResponseDto })
  findById(@Param('searchId') searchId: string) {
    return this.searchesService.findById(searchId);
  }

  @Get(':searchId/products')
  @ApiOperation({ summary: 'List products discovered by a search' })
  @ApiOkResponse({ type: MarketplaceSearchProductsResponseDto })
  findProducts(
    @Param('searchId') searchId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.searchesService.findProducts(searchId, pagination);
  }
}
