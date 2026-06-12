import { Marketplace } from '../../../shared/enums/marketplace.enum';

import { MercadoLivreProductProvider } from './mercado-livre-product.provider';

describe('MercadoLivreProductProvider', () => {
  let provider: MercadoLivreProductProvider;

  beforeEach(() => {
    provider = new MercadoLivreProductProvider();
  });

  it('returns normalized Mercado Livre products respecting the limit', async () => {
    const products = await provider.searchProducts({
      marketplace: Marketplace.MercadoLivre,
      limit: 2,
    });

    expect(products).toHaveLength(2);

    const [product] = products;

    expect(product).toBeDefined();
    expect(product?.marketplace).toBe(Marketplace.MercadoLivre);
    expect(typeof product?.title).toBe('string');
    expect(product?.originalUrl).toContain('mercadolivre.com.br');
    expect(typeof product?.price).toBe('number');
  });

  it('filters fake products by query and category when provided', async () => {
    const products = await provider.searchProducts({
      marketplace: Marketplace.MercadoLivre,
      query: 'headphone',
      category: 'eletronicos',
      limit: 10,
    });

    expect(products).toHaveLength(1);
    expect(products[0]).toEqual(
      expect.objectContaining({
        externalId: 'MLB-HEADPHONE-001',
      }),
    );
  });

  it('returns normalized product details', async () => {
    const details = await provider.getProductDetails(
      'https://www.mercadolivre.com.br/headphone-bluetooth-fake',
    );

    expect(details).toEqual(
      expect.objectContaining({
        marketplace: Marketplace.MercadoLivre,
        title: 'Headphone Bluetooth com cancelamento de ruido',
        availability: 'available',
      }),
    );
    expect(typeof details.description).toBe('string');
    expect(typeof details.sellerName).toBe('string');
  });
});
