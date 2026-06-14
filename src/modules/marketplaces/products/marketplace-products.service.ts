import { Injectable, NotFoundException } from '@nestjs/common';

import { MarketplaceProduct } from '../providers/marketplace-product-search-provider.interface';
import { MarketplaceProductsRepository } from './marketplace-products.repository';
import { Pagination } from '../searches/marketplace-product-searches.repository';

@Injectable()
export class MarketplaceProductsService {
  constructor(private readonly repository: MarketplaceProductsRepository) {}

  saveSearchResults(
    searchId: string,
    products: MarketplaceProduct[],
    foundCount: number = products.length,
  ): Promise<number> {
    return this.repository.saveSearchResults(searchId, products, foundCount);
  }

  async findSearches(productId: string, pagination: Pagination) {
    const searches = await this.repository.findSearches(productId, pagination);

    if (!searches) {
      throw new NotFoundException('Marketplace product not found');
    }

    return searches;
  }
}
