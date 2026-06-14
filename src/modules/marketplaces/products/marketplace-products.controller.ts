import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { MarketplaceProductSearchesResponseDto } from './dto/marketplace-product-searches-response.dto';
import { MarketplaceProductsService } from './marketplace-products.service';

@ApiTags('marketplace-products')
@Controller('marketplace-products')
export class MarketplaceProductsController {
  constructor(private readonly productsService: MarketplaceProductsService) {}

  @Get(':productId/searches')
  @ApiOperation({ summary: 'List searches that discovered a product' })
  @ApiOkResponse({ type: MarketplaceProductSearchesResponseDto })
  findSearches(
    @Param('productId') productId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.productsService.findSearches(productId, pagination);
  }
}
