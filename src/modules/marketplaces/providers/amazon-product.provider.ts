import { Injectable } from '@nestjs/common';

import { Marketplace } from '../../../shared/enums/marketplace.enum';

import {
  MarketplaceProduct,
  MarketplaceProductDetails,
  MarketplaceProductSearchProvider,
  SearchProductsInput,
} from './marketplace-product-search-provider.interface';

// TODO: Implementar integração real com a API da Amazon usando AWS SDK ou scraping, e remover os produtos fake do catálogo.
const AMAZON_FAKE_PRODUCTS: MarketplaceProduct[] = [
  {
    externalId: 'AMZ-KINDLE-001',
    marketplace: Marketplace.Amazon,
    title: 'Leitor digital com tela antirreflexo',
    originalUrl: 'https://www.amazon.com.br/dp/FAKEKINDLE001',
    imageUrl: 'https://m.media-amazon.com/images/I/fake-kindle.jpg',
    price: 499.9,
    rating: 4.9,
    reviewsCount: 7821,
    salesCount: 9800,
    category: 'eletronicos',
    rawData: {
      source: 'fake-provider',
      asin: 'FAKEKINDLE001',
    },
  },
  {
    externalId: 'AMZ-BOOK-002',
    marketplace: Marketplace.Amazon,
    title: 'Livro de estrategias para marketing digital',
    originalUrl: 'https://www.amazon.com.br/dp/FAKEBOOK002',
    imageUrl: 'https://m.media-amazon.com/images/I/fake-book.jpg',
    price: 79.9,
    rating: 4.6,
    reviewsCount: 624,
    salesCount: 2100,
    category: 'livros',
    rawData: {
      source: 'fake-provider',
      asin: 'FAKEBOOK002',
    },
  },
  {
    externalId: 'AMZ-ECHO-003',
    marketplace: Marketplace.Amazon,
    title: 'Caixa inteligente com assistente virtual',
    originalUrl: 'https://www.amazon.com.br/dp/FAKEECHO003',
    imageUrl: 'https://m.media-amazon.com/images/I/fake-echo.jpg',
    price: 349.9,
    rating: 4.8,
    reviewsCount: 3012,
    salesCount: 7300,
    category: 'casa inteligente',
    rawData: {
      source: 'fake-provider',
      asin: 'FAKEECHO003',
    },
  },
];

@Injectable()
export class AmazonProductProvider implements MarketplaceProductSearchProvider {
  readonly marketplace = Marketplace.Amazon;

  searchProducts(input: SearchProductsInput): Promise<MarketplaceProduct[]> {
    const limit = Math.max(input.limit, 0);

    return Promise.resolve(
      AMAZON_FAKE_PRODUCTS.filter((product) =>
        this.matchesInput(product, input),
      ).slice(0, limit),
    );
  }

  getProductDetails(productUrl: string): Promise<MarketplaceProductDetails> {
    const product = AMAZON_FAKE_PRODUCTS.find(
      ({ originalUrl }) => originalUrl === productUrl,
    );

    return Promise.resolve({
      ...(product ?? {
        marketplace: Marketplace.Amazon,
        title: 'Produto Amazon nao encontrado no catalogo fake',
        originalUrl: productUrl,
      }),
      description:
        'Detalhes simulados de produto retornados pelo provider fake da Amazon.',
      sellerName: 'Amazon Fake Store',
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
