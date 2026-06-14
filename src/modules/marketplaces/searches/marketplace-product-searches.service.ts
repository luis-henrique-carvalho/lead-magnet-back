import { Injectable } from '@nestjs/common';

import {
  CreateMarketplaceProductSearchInput,
  MarketplaceProductSearchesRepository,
} from './marketplace-product-searches.repository';

@Injectable()
export class MarketplaceProductSearchesService {
  constructor(
    private readonly repository: MarketplaceProductSearchesRepository,
  ) {}

  create(input: CreateMarketplaceProductSearchInput) {
    return this.repository.createWithTask(input);
  }
}
