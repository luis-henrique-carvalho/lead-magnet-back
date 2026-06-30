import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { MarketplaceSearchAffiliateCaptureTasksResponseDto } from './dto/marketplace-search-affiliate-capture-tasks-response.dto';
import { MarketplaceProductSearchResponseDto } from './dto/marketplace-product-search-response.dto';
import { MarketplaceSearchProductsResponseDto } from './dto/marketplace-search-products-response.dto';
import { MarketplaceProductSearchHistoryResponseDto } from './dto/marketplace-product-search-history-response.dto';
import { MarketplaceSearchHistoryQueryDto } from './dto/marketplace-search-history-query.dto';
import { MarketplaceProductSearchesService } from './marketplace-product-searches.service';

@ApiTags('marketplace-searches')
@Controller('marketplace-searches')
export class MarketplaceProductSearchesController {
  constructor(
    private readonly searchesService: MarketplaceProductSearchesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all marketplace product searches (history)' })
  @ApiOkResponse({ type: MarketplaceProductSearchHistoryResponseDto })
  findAll(@Query() query: MarketplaceSearchHistoryQueryDto) {
    const { page, limit, ...filters } = query;
    return this.searchesService.findAll({ page, limit }, filters);
  }

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

  @Get(':searchId/affiliate-link-capture-tasks')
  @ApiOperation({
    summary: 'List affiliate capture tasks originated by a search',
  })
  @ApiOkResponse({ type: MarketplaceSearchAffiliateCaptureTasksResponseDto })
  findAffiliateLinkCaptureTasks(
    @Param('searchId') searchId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.searchesService.findAffiliateLinkCaptureTasks(
      searchId,
      pagination,
    );
  }
}
