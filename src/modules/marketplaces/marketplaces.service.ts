import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { SearchMarketplaceProductsDto } from './dto/search-marketplace-products.dto';
import { SearchMarketplaceProductsResponseDto } from './dto/search-marketplace-products-response.dto';
import {
  MARKETPLACE_PRODUCT_SEARCH_QUEUE,
  MarketplaceProductSearchJobData,
  SEARCH_PRODUCTS_JOB,
} from './jobs/marketplace-product-search/marketplace-product-search.job';
import { MarketplaceProductSearchesService } from './searches/marketplace-product-searches.service';

@Injectable()
export class MarketplacesService {
  constructor(
    @InjectQueue(MARKETPLACE_PRODUCT_SEARCH_QUEUE)
    private readonly marketplaceSearchQueue: Queue<MarketplaceProductSearchJobData>,
    private readonly searchesService: MarketplaceProductSearchesService,
  ) {}

  async searchProducts(
    input: SearchMarketplaceProductsDto,
  ): Promise<SearchMarketplaceProductsResponseDto> {
    const search = await this.searchesService.create(input);

    await this.marketplaceSearchQueue.add(SEARCH_PRODUCTS_JOB, {
      taskId: search.task.id,
      searchId: search.id,
      marketplace: input.marketplace,
      query: input.query,
      category: input.category,
      limit: input.limit,
    });

    return {
      taskId: search.task.id,
      statusUrl: `/automation-tasks/${search.task.id}`,
      searchId: search.id,
    };
  }
}
