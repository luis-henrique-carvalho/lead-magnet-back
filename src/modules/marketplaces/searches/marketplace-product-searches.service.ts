import { Injectable, NotFoundException, Logger } from '@nestjs/common';

import {
  CreateMarketplaceProductSearchInput,
  MarketplaceProductSearchesRepository,
  Pagination,
} from './marketplace-product-searches.repository';
import { AutomationTaskEventsPublisher } from '../../automation-tasks/events/interfaces/automation-task-events.publisher';

@Injectable()
export class MarketplaceProductSearchesService {
  private readonly logger = new Logger(MarketplaceProductSearchesService.name);

  constructor(
    private readonly repository: MarketplaceProductSearchesRepository,
    private readonly eventsPublisher: AutomationTaskEventsPublisher,
  ) {}

  async create(input: CreateMarketplaceProductSearchInput) {
    const result = await this.repository.createWithTask(input);

    try {
      await this.eventsPublisher.publish('task.created', {
        id: result.task.id,
        type: result.task.type,
        status: result.task.status,
        marketplace: result.task.marketplace,
        updatedAt: result.task.updatedAt,
        searchId: result.id,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish task.created event for task ${result.task.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    return result;
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

  async findAffiliateLinkCaptureTasks(
    searchId: string,
    pagination: Pagination,
  ) {
    const tasks = await this.repository.findAffiliateLinkCaptureTasks(
      searchId,
      pagination,
    );

    if (!tasks) throw new NotFoundException('Marketplace search not found');

    return tasks;
  }
}
