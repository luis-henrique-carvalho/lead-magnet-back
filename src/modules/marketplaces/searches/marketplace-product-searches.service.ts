import { Injectable, NotFoundException } from '@nestjs/common';

import {
  CreateMarketplaceProductSearchInput,
  MarketplaceProductSearchesRepository,
  Pagination,
} from './marketplace-product-searches.repository';

@Injectable()
export class MarketplaceProductSearchesService {
  constructor(
    private readonly repository: MarketplaceProductSearchesRepository,
  ) {}

  create(input: CreateMarketplaceProductSearchInput) {
    return this.repository.createWithTask(input);
  }

  async findById(searchId: string) {
    const search = await this.repository.findById(searchId);

    if (!search) throw new NotFoundException('Marketplace search not found');

    return search;
  }

  async findProducts(searchId: string, pagination: Pagination) {
    const products = await this.repository.findProducts(searchId, pagination);

    if (!products) throw new NotFoundException('Marketplace search not found');

    return products;
  }
}
