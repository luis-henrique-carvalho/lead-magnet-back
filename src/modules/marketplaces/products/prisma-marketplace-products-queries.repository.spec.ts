jest.mock('../../../infra/database/prisma/generated/prisma/client', () => ({
  Prisma: { DbNull: Symbol('DbNull') },
}));
jest.mock('../../../infra/database/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { PrismaMarketplaceProductsRepository } from './prisma-marketplace-products.repository';

describe('PrismaMarketplaceProductsRepository recurrence queries', () => {
  const findProduct = jest.fn();
  const countResults = jest.fn();
  const findResults = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    $transaction: transaction,
    marketplaceProduct: { findUnique: findProduct },
    marketplaceProductSearchResult: {
      count: countResults,
      findMany: findResults,
    },
  } as unknown as PrismaService;
  const repository = new PrismaMarketplaceProductsRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    findProduct.mockResolvedValue({ id: 'product-id' });
  });

  it('returns newest relational discoveries first and excludes legacy rows', async () => {
    const discoveredAt = new Date('2026-06-14T10:00:00.000Z');
    transaction.mockResolvedValue([
      1,
      [
        {
          id: 'result-id',
          discoveredAt,
          search: {
            id: 'search-id',
            taskId: 'task-id',
            marketplace: 'amazon',
            query: 'kindle',
            category: null,
            requestedLimit: 10,
          },
        },
      ],
    ]);

    await expect(
      repository.findSearches('product-id', { page: 1, limit: 20 }),
    ).resolves.toEqual({
      items: [
        {
          searchId: 'search-id',
          taskId: 'task-id',
          marketplace: 'amazon',
          query: 'kindle',
          category: null,
          requestedLimit: 10,
          discoveredAt,
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
      legacyAssociationsExcluded: true,
    });

    expect(findResults).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 'product-id', searchId: { not: null } },
        orderBy: [{ discoveredAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('returns an empty page for a product without relational searches', async () => {
    transaction.mockResolvedValue([0, []]);

    await expect(
      repository.findSearches('product-id', { page: 1, limit: 20 }),
    ).resolves.toEqual({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      legacyAssociationsExcluded: true,
    });
  });

  it('returns null when the product does not exist', async () => {
    findProduct.mockResolvedValue(null);

    await expect(
      repository.findSearches('missing', { page: 1, limit: 20 }),
    ).resolves.toBeNull();

    expect(transaction).not.toHaveBeenCalled();
  });
});
