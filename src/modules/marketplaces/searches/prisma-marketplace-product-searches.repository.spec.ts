jest.mock('../../../infra/database/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { PrismaMarketplaceProductSearchesRepository } from './prisma-marketplace-product-searches.repository';

describe('PrismaMarketplaceProductSearchesRepository queries', () => {
  const findSearch = jest.fn();
  const countSearches = jest.fn();
  const findSearches = jest.fn();
  const countResults = jest.fn();
  const findResults = jest.fn();
  const countDependencies = jest.fn();
  const findDependencies = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    $transaction: transaction,
    marketplaceProductSearch: {
      findUnique: findSearch,
      count: countSearches,
      findMany: findSearches,
    },
    marketplaceProductSearchResult: {
      count: countResults,
      findMany: findResults,
    },
    automationTaskDependency: {
      count: countDependencies,
      findMany: findDependencies,
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

  it('paginates only capture tasks connected by the persisted graph', async () => {
    const taskCreatedAt = new Date('2026-06-14T10:00:00.000Z');
    const capturedAt = new Date('2026-06-14T10:00:30.000Z');
    findSearch.mockResolvedValue({ id: 'search-id', taskId: 'search-task-id' });
    transaction.mockResolvedValue([
      1,
      [
        {
          id: 'dependency-id',
          successor: {
            id: 'capture-task-id',
            status: 'completed',
            marketplace: 'amazon',
            createdAt: taskCreatedAt,
            startedAt: taskCreatedAt,
            finishedAt: capturedAt,
            affiliateLinkCapture: {
              sourceProductId: 'product-id',
              originalProductUrl: 'https://amazon.com.br/dp/B000000001',
              capturedAffiliateUrl: 'https://amzn.to/example',
              createdAt: capturedAt,
              product: { title: 'Kindle' },
            },
          },
        },
      ],
    ]);

    await expect(
      repository.findAffiliateLinkCaptureTasks('search-id', {
        page: 1,
        limit: 20,
      }),
    ).resolves.toEqual({
      items: [
        {
          taskId: 'capture-task-id',
          status: 'completed',
          marketplace: 'amazon',
          productId: 'product-id',
          productTitle: 'Kindle',
          originalProductUrl: 'https://amazon.com.br/dp/B000000001',
          capturedAffiliateUrl: 'https://amzn.to/example',
          taskCreatedAt,
          startedAt: taskCreatedAt,
          finishedAt: capturedAt,
          capturedAt,
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });

    const graphFilter = {
      predecessorId: 'search-task-id',
      successor: { type: 'affiliate_link_capture' },
    };
    expect(countDependencies).toHaveBeenCalledWith({ where: graphFilter });
    expect(findDependencies).toHaveBeenCalledWith(
      expect.objectContaining({ where: graphFilter, skip: 0, take: 20 }),
    );
  });

  it('returns null capture tasks page when the search does not exist', async () => {
    findSearch.mockResolvedValue(null);

    await expect(
      repository.findAffiliateLinkCaptureTasks('missing', {
        page: 1,
        limit: 20,
      }),
    ).resolves.toBeNull();
  });

  it('returns multiple linked capture tasks including unfinished tasks', async () => {
    const createdAt = new Date('2026-06-14T10:00:00.000Z');
    findSearch.mockResolvedValue({ taskId: 'search-task-id' });
    transaction.mockResolvedValue([
      2,
      [
        {
          id: 'dependency-2',
          successor: {
            id: 'capture-task-2',
            status: 'processing',
            marketplace: 'amazon',
            createdAt,
            startedAt: createdAt,
            finishedAt: null,
            affiliateLinkCapture: null,
          },
        },
        {
          id: 'dependency-1',
          successor: {
            id: 'capture-task-1',
            status: 'pending',
            marketplace: 'amazon',
            createdAt,
            startedAt: null,
            finishedAt: null,
            affiliateLinkCapture: null,
          },
        },
      ],
    ]);

    const result = await repository.findAffiliateLinkCaptureTasks('search-id', {
      page: 1,
      limit: 20,
    });

    expect(result).toEqual(
      expect.objectContaining({
        total: 2,
        items: [
          expect.objectContaining({
            taskId: 'capture-task-2',
            capturedAffiliateUrl: null,
          }),
          expect.objectContaining({
            taskId: 'capture-task-1',
            capturedAffiliateUrl: null,
          }),
        ],
      }),
    );
  });

  describe('findAll', () => {
    it('returns a paginated list of search history items ordered by createdAt DESC', async () => {
      const createdAt1 = new Date('2026-06-14T10:00:00.000Z');
      const createdAt2 = new Date('2026-06-14T11:00:00.000Z');
      const taskUpdatedAt1 = new Date('2026-06-14T10:05:00.000Z');
      const taskUpdatedAt2 = new Date('2026-06-14T11:05:00.000Z');

      transaction.mockResolvedValue([
        2,
        [
          {
            id: 'search-2',
            taskId: 'task-2',
            marketplace: 'amazon',
            query: 'kindle',
            category: 'electronics',
            requestedLimit: 20,
            foundCount: 15,
            savedCount: 14,
            createdAt: createdAt2,
            completedAt: createdAt2,
            task: {
              status: 'completed',
              error: null,
              errorType: null,
              startedAt: createdAt2,
              finishedAt: createdAt2,
              updatedAt: taskUpdatedAt2,
            },
          },
          {
            id: 'search-1',
            taskId: 'task-1',
            marketplace: 'amazon',
            query: 'phone',
            category: 'electronics',
            requestedLimit: 10,
            foundCount: 5,
            savedCount: 4,
            createdAt: createdAt1,
            completedAt: null,
            task: {
              status: 'failed',
              error: 'Timeout error',
              errorType: 'timeout',
              startedAt: createdAt1,
              finishedAt: null,
              updatedAt: taskUpdatedAt1,
            },
          },
        ],
      ]);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        items: [
          {
            searchId: 'search-2',
            taskId: 'task-2',
            marketplace: 'amazon',
            query: 'kindle',
            category: 'electronics',
            requestedLimit: 20,
            foundCount: 15,
            savedCount: 14,
            createdAt: createdAt2,
            completedAt: createdAt2,
            task: {
              status: 'completed',
              error: null,
              errorType: null,
              startedAt: createdAt2,
              finishedAt: createdAt2,
              updatedAt: taskUpdatedAt2,
            },
          },
          {
            searchId: 'search-1',
            taskId: 'task-1',
            marketplace: 'amazon',
            query: 'phone',
            category: 'electronics',
            requestedLimit: 10,
            foundCount: 5,
            savedCount: 4,
            createdAt: createdAt1,
            completedAt: null,
            task: {
              status: 'failed',
              error: 'Timeout error',
              errorType: 'timeout',
              startedAt: createdAt1,
              finishedAt: null,
              updatedAt: taskUpdatedAt1,
            },
          },
        ],
        page: 1,
        limit: 10,
        total: 2,
      });

      expect(transaction).toHaveBeenCalled();
      expect(countSearches).toHaveBeenCalledWith({ where: {} });
      expect(findSearches).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: 0,
          take: 10,
          include: { task: true },
        }),
      );
    });

    it('returns empty results when no searches are found', async () => {
      transaction.mockResolvedValue([0, []]);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        items: [],
        page: 1,
        limit: 10,
        total: 0,
      });
    });

    it('applies filters correctly: query, marketplace, status', async () => {
      transaction.mockResolvedValue([0, []]);

      await repository.findAll(
        { page: 1, limit: 10 },
        {
          query: 'kindle',
          marketplace: 'amazon' as any,
          status: 'completed' as any,
        },
      );

      const expectedWhere = {
        query: { contains: 'kindle', mode: 'insensitive' },
        marketplace: 'amazon',
        task: { status: 'completed' },
      };

      expect(countSearches).toHaveBeenCalledWith({ where: expectedWhere });
      expect(findSearches).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expectedWhere,
        }),
      );
    });
  });
});
