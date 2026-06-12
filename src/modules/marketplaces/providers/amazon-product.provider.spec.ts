import { Marketplace } from '../../../shared/enums/marketplace.enum';

import { AmazonProductProvider } from './amazon-product.provider';

describe('AmazonProductProvider', () => {
  let provider: AmazonProductProvider;

  beforeEach(() => {
    provider = new AmazonProductProvider();
  });

  it('returns normalized Amazon products respecting the limit', async () => {
    const products = await provider.searchProducts({
      marketplace: Marketplace.Amazon,
      limit: 2,
    });

    expect(products).toHaveLength(2);

    const [product] = products;

    expect(product).toBeDefined();
    expect(product?.marketplace).toBe(Marketplace.Amazon);
    expect(typeof product?.title).toBe('string');
    expect(product?.originalUrl).toContain('amazon.com.br');
    expect(typeof product?.price).toBe('number');
  });

  it('filters fake products by query and category when provided', async () => {
    const products = await provider.searchProducts({
      marketplace: Marketplace.Amazon,
      query: 'livro',
      category: 'livros',
      limit: 10,
    });

    expect(products).toHaveLength(1);
    expect(products[0]).toEqual(
      expect.objectContaining({
        externalId: 'AMZ-BOOK-002',
      }),
    );
  });

  it('returns normalized product details', async () => {
    const details = await provider.getProductDetails(
      'https://www.amazon.com.br/dp/FAKEKINDLE001',
    );

    expect(details).toEqual(
      expect.objectContaining({
        marketplace: Marketplace.Amazon,
        title: 'Leitor digital com tela antirreflexo',
        availability: 'available',
      }),
    );
    expect(typeof details.description).toBe('string');
    expect(typeof details.sellerName).toBe('string');
  });
});
