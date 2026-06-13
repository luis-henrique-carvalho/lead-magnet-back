import { Marketplace } from '../../../shared/enums/marketplace.enum';

import { AmazonProductProvider } from './amazon/amazon-product.provider';
import { MarketplaceProductProviderRegistry } from './marketplace-product-provider.registry';
import { MercadoLivreProductProvider } from './mercado-livre/mercado-livre-product.provider';

describe('MarketplaceProductProviderRegistry', () => {
  let amazonProductProvider: AmazonProductProvider;
  let mercadoLivreProductProvider: MercadoLivreProductProvider;
  let registry: MarketplaceProductProviderRegistry;

  beforeEach(() => {
    mercadoLivreProductProvider = new MercadoLivreProductProvider({} as any);
    amazonProductProvider = new AmazonProductProvider();
    registry = new MarketplaceProductProviderRegistry(
      mercadoLivreProductProvider,
      amazonProductProvider,
    );
  });

  it('returns the correct provider for Mercado Livre', () => {
    expect(registry.getProvider(Marketplace.MercadoLivre)).toBe(
      mercadoLivreProductProvider,
    );
  });

  it('returns the correct provider for Amazon', () => {
    expect(registry.getProvider(Marketplace.Amazon)).toBe(
      amazonProductProvider,
    );
  });

  it('fails explicitly when the marketplace is not registered', () => {
    expect(() => registry.getProvider(Marketplace.Shopee)).toThrow(
      'Marketplace product search provider not registered: shopee',
    );
  });
});
