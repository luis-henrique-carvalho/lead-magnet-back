jest.mock('../../../infra/database/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { MarketplaceSearchResultOriginState } from './marketplace-search-results.repository';
import { PrismaMarketplaceSearchResultsRepository } from './prisma-marketplace-search-results.repository';

describe('PrismaMarketplaceSearchResultsRepository', () => {
  const findResult = jest.fn();
  const prisma = {
    marketplaceProductSearchResult: { findUnique: findResult },
  } as unknown as PrismaService;
  const repository = new PrismaMarketplaceSearchResultsRepository(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('loads result, search and task through one relational query', async () => {
    const createdAt = new Date('2026-06-14T10:00:00.000Z');
    const finishedAt = new Date('2026-06-14T10:01:00.000Z');
    findResult.mockResolvedValue({
      id: 'result-id',
      search: {
        id: 'search-id',
        marketplace: 'amazon',
        query: 'kindle',
        category: null,
        task: {
          id: 'task-id',
          type: 'marketplace_product_search',
          status: 'completed',
          marketplace: 'amazon',
          createdAt,
          finishedAt,
        },
      },
    });

    await expect(repository.findOriginTask('result-id')).resolves.toEqual({
      state: MarketplaceSearchResultOriginState.Found,
      origin: {
        resultId: 'result-id',
        search: {
          searchId: 'search-id',
          marketplace: 'amazon',
          query: 'kindle',
          category: null,
        },
        task: {
          taskId: 'task-id',
          type: 'marketplace_product_search',
          status: 'completed',
          marketplace: 'amazon',
          createdAt,
          finishedAt,
        },
      },
    });

    expect(findResult).toHaveBeenCalledTimes(1);
    expect(findResult).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'result-id' } }),
    );
  });

  it('identifies a legacy result without inferring its origin', async () => {
    findResult.mockResolvedValue({ id: 'legacy-result', search: null });

    await expect(repository.findOriginTask('legacy-result')).resolves.toEqual({
      state: MarketplaceSearchResultOriginState.Legacy,
    });
  });

  it('returns null when the result does not exist', async () => {
    findResult.mockResolvedValue(null);

    await expect(repository.findOriginTask('missing')).resolves.toBeNull();
  });
});
