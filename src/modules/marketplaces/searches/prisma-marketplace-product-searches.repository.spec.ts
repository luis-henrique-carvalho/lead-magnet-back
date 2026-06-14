jest.mock('../../../infra/database/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { PrismaMarketplaceProductSearchesRepository } from './prisma-marketplace-product-searches.repository';

describe('PrismaMarketplaceProductSearchesRepository queries', () => {
  const findSearch = jest.fn();
  const countResults = jest.fn();
  const findResults = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    $transaction: transaction,
    marketplaceProductSearch: { findUnique: findSearch },
    marketplaceProductSearchResult: {
      count: countResults,
      findMany: findResults,
    },
  } as unknown as PrismaService;
  const repository = new PrismaMarketplaceProductSearchesRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    findSearch.mockResolvedValue({ id: 'search-id' });
    transaction.mockResolvedValue([0, []]);
  });

  it('maps the search detail contract', async () => {
    const createdAt = new Date('2026-06-14T10:00:00.000Z');
    findSearch.mockResolvedValue({
      id: 'search-id',
      taskId: 'task-id',
      marketplace: 'amazon',
      query: null,
      category: null,
      requestedLimit: 10,
      foundCount: 8,
      savedCount: 7,
      createdAt,
      completedAt: null,
    });

    await expect(repository.findById('search-id')).resolves.toEqual({
      searchId: 'search-id',
      taskId: 'task-id',
      marketplace: 'amazon',
      query: null,
      category: null,
      requestedLimit: 10,
      foundCount: 8,
      savedCount: 7,
      createdAt,
      completedAt: null,
    });
  });

  it('paginates products in deterministic discovery order', async () => {
    const discoveredAt = new Date('2026-06-14T10:00:00.000Z');
    transaction.mockResolvedValue([
      1,
      [
        {
          id: 'result-id',
          discoveredAt,
          product: {
            id: 'product-id',
            externalId: 'AMZ-1',
            marketplace: 'amazon',
            title: 'Kindle',
            originalUrl: 'https://example.com/kindle',
            imageUrl: null,
            price: null,
            rating: null,
            reviewsCount: null,
            salesCount: null,
            category: null,
          },
        },
      ],
    ]);

    await expect(
      repository.findProducts('search-id', { page: 2, limit: 5 }),
    ).resolves.toEqual({
      items: [
        {
          resultId: 'result-id',
          discoveredAt,
          product: {
            id: 'product-id',
            externalId: 'AMZ-1',
            marketplace: 'amazon',
            title: 'Kindle',
            originalUrl: 'https://example.com/kindle',
            imageUrl: null,
            price: null,
            rating: null,
            reviewsCount: null,
            salesCount: null,
            category: null,
          },
        },
      ],
      page: 2,
      limit: 5,
      total: 1,
    });

    expect(findResults).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        orderBy: [{ discoveredAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('returns null products page when the search does not exist', async () => {
    findSearch.mockResolvedValue(null);

    await expect(
      repository.findProducts('missing', { page: 1, limit: 20 }),
    ).resolves.toBeNull();

    expect(transaction).not.toHaveBeenCalled();
  });
});
