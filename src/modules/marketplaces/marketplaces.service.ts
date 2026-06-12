import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { MarketplaceProductResponseDto } from './dto/marketplace-product-response.dto';
import { SearchMarketplaceProductsDto } from './dto/search-marketplace-products.dto';
import { MarketplaceProductProviderRegistry } from './providers/marketplace-product-provider.registry';
import { MarketplaceProductSearchProvider } from './providers/marketplace-product-search-provider.interface';

@Injectable()
export class MarketplacesService {
  constructor(
    private readonly providerRegistry: MarketplaceProductProviderRegistry,
  ) {}

  async searchProducts(
    input: SearchMarketplaceProductsDto,
  ): Promise<MarketplaceProductResponseDto[]> {
    let provider: MarketplaceProductSearchProvider;

    try {
      provider = this.providerRegistry.getProvider(input.marketplace);
    } catch {
      throw new UnprocessableEntityException(
        `Marketplace not supported: ${input.marketplace}`,
      );
    }

    const products = await provider.searchProducts(input);

    return products.map((product) =>
      MarketplaceProductResponseDto.fromProduct(product),
    );
  }
}
