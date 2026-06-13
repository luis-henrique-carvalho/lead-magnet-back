import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SearchMarketplaceProductsDto } from './dto/search-marketplace-products.dto';
import { SearchMarketplaceProductsResponseDto } from './dto/search-marketplace-products-response.dto';
import { MarketplacesService } from './marketplaces.service';

@ApiTags('marketplaces')
@Controller('marketplaces')
export class MarketplacesController {
  constructor(private readonly marketplacesService: MarketplacesService) {}

  @Post('search')
  @ApiOperation({ summary: 'Queue a marketplace product search' })
  @ApiCreatedResponse({ type: SearchMarketplaceProductsResponseDto })
  search(
    @Body() input: SearchMarketplaceProductsDto,
  ): Promise<SearchMarketplaceProductsResponseDto> {
    return this.marketplacesService.searchProducts(input);
  }
}
