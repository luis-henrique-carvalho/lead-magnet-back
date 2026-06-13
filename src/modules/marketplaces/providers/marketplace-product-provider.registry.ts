import { Injectable } from '@nestjs/common';

import { Marketplace } from '../../../shared/enums/marketplace.enum';

import { AmazonProductProvider } from './amazon/amazon-product.provider';
import { MarketplaceProductSearchProvider } from './marketplace-product-search-provider.interface';
import { MercadoLivreProductProvider } from './mercado-livre/mercado-livre-product.provider';

@Injectable()
export class MarketplaceProductProviderRegistry {
  private readonly providers: Map<
    Marketplace,
    MarketplaceProductSearchProvider
  >;

  constructor(
    mercadoLivreProductProvider: MercadoLivreProductProvider,
    amazonProductProvider: AmazonProductProvider,
  ) {
    this.providers = new Map<Marketplace, MarketplaceProductSearchProvider>([
      [mercadoLivreProductProvider.marketplace, mercadoLivreProductProvider],
      [amazonProductProvider.marketplace, amazonProductProvider],
    ]);
  }

  getProvider(marketplace: Marketplace): MarketplaceProductSearchProvider {
    const provider = this.providers.get(marketplace);

    if (!provider) {
      throw new Error(
        `Marketplace product search provider not registered: ${marketplace}`,
      );
    }

    return provider;
  }
}
