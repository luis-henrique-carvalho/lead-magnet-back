import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';

import { AutomationTasksService } from '../automation-tasks/automation-tasks.service';
import { AutomationTaskType } from '../../shared/enums/automation-task-type.enum';
import { SearchMarketplaceProductsDto } from './dto/search-marketplace-products.dto';
import { SearchMarketplaceProductsResponseDto } from './dto/search-marketplace-products-response.dto';
import {
  MARKETPLACE_PRODUCT_SEARCH_QUEUE,
  MarketplaceProductSearchJobData,
  SEARCH_PRODUCTS_JOB,
} from './jobs/marketplace-product-search/marketplace-product-search.job';

@Injectable()
export class MarketplacesService {
  constructor(
    @InjectQueue(MARKETPLACE_PRODUCT_SEARCH_QUEUE)
    private readonly marketplaceSearchQueue: Queue<MarketplaceProductSearchJobData>,
    private readonly automationTasksService: AutomationTasksService,
  ) {}

  async searchProducts(
    input: SearchMarketplaceProductsDto,
  ): Promise<SearchMarketplaceProductsResponseDto> {
    const task = await this.automationTasksService.create({
      type: AutomationTaskType.MarketplaceProductSearch,
      marketplace: input.marketplace,
    });

    const searchId = randomUUID();

    await this.marketplaceSearchQueue.add(SEARCH_PRODUCTS_JOB, {
      taskId: task.id,
      searchId,
      marketplace: input.marketplace,
      query: input.query,
      category: input.category,
      limit: input.limit,
    });

    return {
      taskId: task.id,
      statusUrl: `/automation-tasks/${task.id}`,
      searchId,
    };
  }
}
