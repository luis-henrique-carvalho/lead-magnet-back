jest.mock('../../../infra/database/prisma/generated/prisma/client', () => ({
  Prisma: { DbNull: Symbol('DbNull') },
}));
jest.mock('../../../infra/database/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { Marketplace } from '../../../shared/enums/marketplace.enum';
import { PrismaMarketplaceProductsRepository } from './prisma-marketplace-products.repository';

describe('PrismaMarketplaceProductsRepository', () => {
  const upsert = jest.fn();
  const createMany = jest.fn();
  const transactionClient = {
    marketplaceProduct: { upsert },
    marketplaceProductSearchResult: { createMany },
  };
  const transaction = jest.fn(
    (callback: (client: typeof transactionClient) => Promise<number>) =>
      callback(transactionClient),
  );
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  const repository = new PrismaMarketplaceProductsRepository(prisma);

  const products = [
    {
      externalId: 'AMZ-1',
      marketplace: Marketplace.Amazon,
      title: 'Leitor digital',
      originalUrl: 'https://amazon.com.br/dp/AMZ-1',
      price: 499.9,
      rawData: { asin: 'AMZ-1' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    upsert.mockResolvedValue({ id: 'product-id' });
  });

  it('upserts products and creates search links in one transaction', async () => {
    createMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.saveSearchResults('search-id', products),
    ).resolves.toBe(1);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          marketplace_originalUrl: {
            marketplace: Marketplace.Amazon,
            originalUrl: 'https://amazon.com.br/dp/AMZ-1',
          },
        },
      }),
    );
    expect(createMany).toHaveBeenCalledWith({
      data: [{ searchId: 'search-id', productId: 'product-id' }],
      skipDuplicates: true,
    });
  });

  it('returns zero saved products when reprocessing the same search', async () => {
    createMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.saveSearchResults('search-id', products),
    ).resolves.toBe(0);
  });
});
