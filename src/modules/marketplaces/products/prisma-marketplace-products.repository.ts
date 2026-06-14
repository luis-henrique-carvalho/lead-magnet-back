import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../infra/database/prisma/generated/prisma/client';
import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import {
  MarketplaceProductsRepository,
  PaginatedMarketplaceProductSearches,
  PersistMarketplaceProductInput,
} from './marketplace-products.repository';
import { Pagination } from '../searches/marketplace-product-searches.repository';

@Injectable()
export class PrismaMarketplaceProductsRepository implements MarketplaceProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  saveSearchResults(
    searchId: string,
    products: PersistMarketplaceProductInput[],
    foundCount: number,
  ): Promise<number> {
    return this.prisma.$transaction(async (transaction) => {
      const productIds: string[] = [];

      for (const product of products) {
        const persistedProduct = await transaction.marketplaceProduct.upsert({
          where: {
            marketplace_originalUrl: {
              marketplace: product.marketplace,
              originalUrl: product.originalUrl,
            },
          },
          create: this.toPersistenceData(product),
          update: this.toPersistenceData(product),
          select: { id: true },
        });

        productIds.push(persistedProduct.id);
      }

      const result = productIds.length
        ? await transaction.marketplaceProductSearchResult.createMany({
            data: productIds.map((productId) => ({ searchId, productId })),
            skipDuplicates: true,
          })
        : { count: 0 };

      await transaction.marketplaceProductSearch.update({
        where: { id: searchId },
        data: {
          foundCount,
          savedCount: { increment: result.count },
          completedAt: new Date(),
        },
      });

      return result.count;
    });
  }

  private toPersistenceData(
    product: PersistMarketplaceProductInput,
  ): Prisma.MarketplaceProductUncheckedCreateInput {
    return {
      externalId: product.externalId ?? null,
      marketplace: product.marketplace,
      title: product.title,
      originalUrl: product.originalUrl,
      imageUrl: product.imageUrl ?? null,
      price: product.price ?? null,
      rating: product.rating ?? null,
      reviewsCount: product.reviewsCount ?? null,
      salesCount: product.salesCount ?? null,
      category: product.category ?? null,
      rawData: this.toJsonInput(product.rawData),
    };
  }

  private toJsonInput(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    if (value === undefined || value === null) {
      return Prisma.DbNull;
    }

    return value;
  }

  async findSearches(
    productId: string,
    pagination: Pagination,
  ): Promise<PaginatedMarketplaceProductSearches | null> {
    const product = await this.prisma.marketplaceProduct.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) return null;

    const where = { productId, searchId: { not: null } };
    const [total, results] = await this.prisma.$transaction([
      this.prisma.marketplaceProductSearchResult.count({ where }),
      this.prisma.marketplaceProductSearchResult.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: [{ discoveredAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          discoveredAt: true,
          search: {
            select: {
              id: true,
              taskId: true,
              marketplace: true,
              query: true,
              category: true,
              requestedLimit: true,
            },
          },
        },
      }),
    ]);

    return {
      items: results.flatMap((result) => {
        if (!result.search) return [];

        return [
          {
            searchId: result.search.id,
            taskId: result.search.taskId,
            marketplace: result.search
              .marketplace as PaginatedMarketplaceProductSearches['items'][number]['marketplace'],
            query: result.search.query,
            category: result.search.category,
            requestedLimit: result.search.requestedLimit,
            discoveredAt: result.discoveredAt,
          },
        ];
      }),
      ...pagination,
      total,
      legacyAssociationsExcluded: true,
    };
  }
}
