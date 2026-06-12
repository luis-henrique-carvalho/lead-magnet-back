import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { MarketplaceProductResponseDto } from './dto/marketplace-product-response.dto';
import { SearchMarketplaceProductsDto } from './dto/search-marketplace-products.dto';
import { MarketplacesService } from './marketplaces.service';

@ApiTags('marketplaces')
@Controller('marketplaces')
export class MarketplacesController {
  constructor(private readonly marketplacesService: MarketplacesService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search fake products in a marketplace' })
  @ApiCreatedResponse({ type: MarketplaceProductResponseDto, isArray: true })
  @ApiUnprocessableEntityResponse({
    description: 'The marketplace has no registered search provider',
  })
  search(
    @Body() input: SearchMarketplaceProductsDto,
  ): Promise<MarketplaceProductResponseDto[]> {
    return this.marketplacesService.searchProducts(input);
  }
}
