import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../infra/database/prisma/generated/prisma/client';
import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import {
  MarketplaceProductsRepository,
  PersistMarketplaceProductInput,
} from './marketplace-products.repository';

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
}
