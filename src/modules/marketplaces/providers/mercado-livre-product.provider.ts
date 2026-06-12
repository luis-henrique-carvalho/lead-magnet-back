import { Injectable } from '@nestjs/common';

import { Marketplace } from '../../../shared/enums/marketplace.enum';

import {
  MarketplaceProduct,
  MarketplaceProductDetails,
  MarketplaceProductSearchProvider,
  SearchProductsInput,
} from './marketplace-product-search-provider.interface';

const MERCADO_LIVRE_FAKE_PRODUCTS: MarketplaceProduct[] = [
  {
    externalId: 'MLB-HEADPHONE-001',
    marketplace: Marketplace.MercadoLivre,
    title: 'Headphone Bluetooth com cancelamento de ruido',
    originalUrl: 'https://www.mercadolivre.com.br/headphone-bluetooth-fake',
    imageUrl: 'https://http2.mlstatic.com/fake-headphone.webp',
    price: 249.9,
    rating: 4.8,
    reviewsCount: 1842,
    salesCount: 5200,
    category: 'eletronicos',
    rawData: {
      source: 'fake-provider',
      listingType: 'gold_special',
    },
  },
  {
    externalId: 'MLB-AIR-FRYER-002',
    marketplace: Marketplace.MercadoLivre,
    title: 'Air fryer digital 5 litros antiaderente',
    originalUrl: 'https://www.mercadolivre.com.br/air-fryer-digital-fake',
    imageUrl: 'https://http2.mlstatic.com/fake-air-fryer.webp',
    price: 399.9,
    rating: 4.7,
    reviewsCount: 936,
    salesCount: 3100,
    category: 'casa',
    rawData: {
      source: 'fake-provider',
      listingType: 'gold_pro',
    },
  },
  {
    externalId: 'MLB-SMARTWATCH-003',
    marketplace: Marketplace.MercadoLivre,
    title: 'Smartwatch resistente a agua com GPS',
    originalUrl: 'https://www.mercadolivre.com.br/smartwatch-gps-fake',
    imageUrl: 'https://http2.mlstatic.com/fake-smartwatch.webp',
    price: 189.9,
    rating: 4.5,
    reviewsCount: 421,
    salesCount: 1200,
    category: 'eletronicos',
    rawData: {
      source: 'fake-provider',
      listingType: 'gold_special',
    },
  },
];

@Injectable()
export class MercadoLivreProductProvider implements MarketplaceProductSearchProvider {
  readonly marketplace = Marketplace.MercadoLivre;

  searchProducts(input: SearchProductsInput): Promise<MarketplaceProduct[]> {
    const limit = Math.max(input.limit, 0);

    return Promise.resolve(
      MERCADO_LIVRE_FAKE_PRODUCTS.filter((product) =>
        this.matchesInput(product, input),
      ).slice(0, limit),
    );
  }

  getProductDetails(productUrl: string): Promise<MarketplaceProductDetails> {
    const product = MERCADO_LIVRE_FAKE_PRODUCTS.find(
      ({ originalUrl }) => originalUrl === productUrl,
    );

    return Promise.resolve({
      ...(product ?? {
        marketplace: Marketplace.MercadoLivre,
        title: 'Produto Mercado Livre nao encontrado no catalogo fake',
        originalUrl: productUrl,
      }),
      description:
        'Detalhes simulados de produto retornados pelo provider fake do Mercado Livre.',
      sellerName: 'Loja Mercado Livre Fake',
      availability: 'available',
    });
  }

  private matchesInput(
    product: MarketplaceProduct,
    input: SearchProductsInput,
  ): boolean {
    const query = input.query?.trim().toLowerCase();
    const category = input.category?.trim().toLowerCase();

    const matchesQuery = query
      ? product.title.toLowerCase().includes(query)
      : true;
    const matchesCategory = category
      ? product.category?.toLowerCase() === category
      : true;

    return matchesQuery && matchesCategory;
  }
}
