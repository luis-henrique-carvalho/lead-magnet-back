import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';
import type { AutomationTask } from '../../automation-tasks/automation-task.types';
import {
  CreatedMarketplaceProductSearch,
  CreateMarketplaceProductSearchInput,
  MarketplaceProductSearchDetail,
  MarketplaceProductSearchesRepository,
  PaginatedMarketplaceSearchProducts,
  Pagination,
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

  async findById(
    searchId: string,
  ): Promise<MarketplaceProductSearchDetail | null> {
    const search = await this.prisma.marketplaceProductSearch.findUnique({
      where: { id: searchId },
      select: {
        id: true,
        taskId: true,
        marketplace: true,
        query: true,
        category: true,
        requestedLimit: true,
        foundCount: true,
        savedCount: true,
        createdAt: true,
        completedAt: true,
      },
    });

    if (!search) return null;

    const { id, marketplace, ...detail } = search;

    return {
      ...detail,
      searchId: id,
      marketplace: marketplace as MarketplaceProductSearchDetail['marketplace'],
    };
  }

  async findProducts(
    searchId: string,
    pagination: Pagination,
  ): Promise<PaginatedMarketplaceSearchProducts | null> {
    const search = await this.prisma.marketplaceProductSearch.findUnique({
      where: { id: searchId },
      select: { id: true },
    });

    if (!search) return null;

    const where = { searchId };
    const [total, results] = await this.prisma.$transaction([
      this.prisma.marketplaceProductSearchResult.count({ where }),
      this.prisma.marketplaceProductSearchResult.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: [{ discoveredAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          discoveredAt: true,
          product: {
            select: {
              id: true,
              externalId: true,
              marketplace: true,
              title: true,
              originalUrl: true,
              imageUrl: true,
              price: true,
              rating: true,
              reviewsCount: true,
              salesCount: true,
              category: true,
            },
          },
        },
      }),
    ]);

    return {
      items: results.map((result) => ({
        resultId: result.id,
        discoveredAt: result.discoveredAt,
        product: {
          ...result.product,
          marketplace: result.product
            .marketplace as PaginatedMarketplaceSearchProducts['items'][number]['product']['marketplace'],
          price:
            result.product.price === null ? null : Number(result.product.price),
        },
      })),
      ...pagination,
      total,
    };
  }
}
