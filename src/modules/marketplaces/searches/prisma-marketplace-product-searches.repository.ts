import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';
import type { AutomationTask } from '../../automation-tasks/automation-task.types';
import {
  CreatedMarketplaceProductSearch,
  CreateMarketplaceProductSearchInput,
  MarketplaceProductSearchesRepository,
} from './marketplace-product-searches.repository';

@Injectable()
export class PrismaMarketplaceProductSearchesRepository implements MarketplaceProductSearchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithTask(
    input: CreateMarketplaceProductSearchInput,
  ): Promise<CreatedMarketplaceProductSearch> {
    return this.prisma.$transaction(async (transaction) => {
      const task = await transaction.automationTask.create({
        data: {
          type: AutomationTaskType.MarketplaceProductSearch,
          marketplace: input.marketplace,
        },
      });
      const search = await transaction.marketplaceProductSearch.create({
        data: {
          taskId: task.id,
          marketplace: input.marketplace,
          query: input.query,
          category: input.category,
          requestedLimit: input.limit,
        },
      });

      return { id: search.id, task: task as AutomationTask };
    });
  }
}
