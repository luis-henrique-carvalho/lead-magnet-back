import { UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Marketplace } from '../../shared/enums/marketplace.enum';
import { MarketplaceProductProviderRegistry } from './providers/marketplace-product-provider.registry';
import { MarketplaceProductSearchProvider } from './providers/marketplace-product-search-provider.interface';
import { MarketplacesService } from './marketplaces.service';

describe('MarketplacesService', () => {
  let provider: jest.Mocked<MarketplaceProductSearchProvider>;
  let registry: jest.Mocked<MarketplaceProductProviderRegistry>;
  let service: MarketplacesService;
  let getProvider: jest.Mock;
  let searchProducts: jest.Mock;

  beforeEach(async () => {
    getProvider = jest.fn();
    searchProducts = jest.fn();
    provider = {
      marketplace: Marketplace.MercadoLivre,
      getProductDetails: jest.fn(),
      searchProducts,
    };
    registry = {
      getProvider,
    } as unknown as jest.Mocked<MarketplaceProductProviderRegistry>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplacesService,
        {
          provide: MarketplaceProductProviderRegistry,
          useValue: registry,
        },
      ],
    }).compile();

    service = module.get(MarketplacesService);
  });

  it('uses the registered provider and returns normalized public products', async () => {
    getProvider.mockReturnValue(provider);
    searchProducts.mockResolvedValue([
      {
        marketplace: Marketplace.MercadoLivre,
        title: 'Headphone Bluetooth',
        originalUrl: 'https://www.mercadolivre.com.br/headphone',
        price: 249.9,
        rawData: { internal: true },
      },
    ]);

    const input = {
      marketplace: Marketplace.MercadoLivre,
      query: 'headphone',
      category: 'eletronicos',
      limit: 5,
    };
    const result = await service.searchProducts(input);

    expect(getProvider).toHaveBeenCalledWith(Marketplace.MercadoLivre);
    expect(searchProducts).toHaveBeenCalledWith(input);
    expect(result).toEqual([
      expect.objectContaining({
        marketplace: Marketplace.MercadoLivre,
        title: 'Headphone Bluetooth',
        originalUrl: 'https://www.mercadolivre.com.br/headphone',
        price: 249.9,
      }),
    ]);
    expect(result[0]).not.toHaveProperty('rawData');
  });

  it('throws an HTTP exception when the marketplace has no provider', async () => {
    getProvider.mockImplementation(() => {
      throw new Error('Provider not registered');
    });

    await expect(
      service.searchProducts({
        marketplace: Marketplace.Shopee,
        limit: 10,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});
