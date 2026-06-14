import { Injectable } from '@nestjs/common';

import { MarketplaceProduct } from '../providers/marketplace-product-search-provider.interface';
import { MarketplaceProductsRepository } from './marketplace-products.repository';

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
}
