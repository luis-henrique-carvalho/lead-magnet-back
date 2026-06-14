import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import {
  MarketplaceSearchResultOrigin,
  MarketplaceSearchResultOriginLookup,
  MarketplaceSearchResultOriginState,
  MarketplaceSearchResultsRepository,
} from './marketplace-search-results.repository';

@Injectable()
export class PrismaMarketplaceSearchResultsRepository implements MarketplaceSearchResultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOriginTask(
    resultId: string,
  ): Promise<MarketplaceSearchResultOriginLookup | null> {
    const result = await this.prisma.marketplaceProductSearchResult.findUnique({
      where: { id: resultId },
      select: {
        id: true,
        search: {
          select: {
            id: true,
            marketplace: true,
            query: true,
            category: true,
            task: {
              select: {
                id: true,
                type: true,
                status: true,
                marketplace: true,
                createdAt: true,
                finishedAt: true,
              },
            },
          },
        },
      },
    });

    if (!result) return null;
    if (!result.search) {
      return { state: MarketplaceSearchResultOriginState.Legacy };
    }

    return {
      state: MarketplaceSearchResultOriginState.Found,
      origin: {
        resultId: result.id,
        search: {
          searchId: result.search.id,
          marketplace: result.search
            .marketplace as MarketplaceSearchResultOrigin['search']['marketplace'],
          query: result.search.query,
          category: result.search.category,
        },
        task: {
          taskId: result.search.task.id,
          type: result.search.task
            .type as MarketplaceSearchResultOrigin['task']['type'],
          status: result.search.task
            .status as MarketplaceSearchResultOrigin['task']['status'],
          marketplace: result.search.task.marketplace,
          createdAt: result.search.task.createdAt,
          finishedAt: result.search.task.finishedAt,
        },
      },
    };
  }
}
