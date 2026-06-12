import { Test, TestingModule } from '@nestjs/testing';

import { Marketplace } from '../../../../shared/enums/marketplace.enum';
import { PlaywrightService } from '../../../../infra/browser';
import { MarketplaceProduct } from '../marketplace-product-search-provider.interface';
import { MercadoLivreProductProvider } from './mercado-livre-product.provider';
import {
  normalizeMercadoLivreCard,
  parseMercadoLivrePrice,
} from './mercado-livre-product-parser.utils';

type EvaluatedCard = {
  href: string;
  title?: string | null;
  text?: string | null;
  ariaLabel?: string | null;
  imageUrl?: string | null;
  priceText?: string | null;
  ratingText?: string | null;
  reviewsText?: string | null;
  salesText?: string | null;
};

const HUB_URL =
  'https://www.mercadolivre.com.br/afiliados/hub?is_affiliate=true#menu-user';

describe('MercadoLivreProductProvider', () => {
  let provider: MercadoLivreProductProvider;
  let openAuthenticatedPage: jest.MockedFunction<
    PlaywrightService['openAuthenticatedPage']
  >;
  let close: jest.MockedFunction<{ close: () => Promise<void> }['close']>;

  const createPage = (cards: EvaluatedCard[], url = HUB_URL) => {
    const mockElement = {
      isVisible: jest.fn().mockResolvedValue(false),
      click: jest.fn().mockResolvedValue(undefined),
      fill: jest.fn().mockResolvedValue(undefined),
      press: jest.fn().mockResolvedValue(undefined),
      waitFor: jest.fn().mockResolvedValue(undefined),
      first: jest.fn(),
      filter: jest.fn(),
      nth: jest.fn(),
    };

    mockElement.first.mockReturnValue(mockElement);
    mockElement.filter.mockReturnValue(mockElement);
    mockElement.nth.mockReturnValue(mockElement);

    return {
      url: jest.fn().mockReturnValue(url),
      waitForLoadState: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue(cards),
      getByRole: jest.fn().mockReturnValue(mockElement),
      getByText: jest.fn().mockReturnValue(mockElement),
      locator: jest.fn().mockReturnValue(mockElement),
    } as unknown as Parameters<
      PlaywrightService['openAuthenticatedPage']
    >[1] extends never
      ? never
      : import('playwright').Page;
  };

  const usePage = (page: import('playwright').Page): void => {
    close = jest.fn().mockResolvedValue(undefined);
    openAuthenticatedPage.mockResolvedValue({
      context: {} as never,
      page,
      close,
    });
  };

  beforeEach(async () => {
    openAuthenticatedPage = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoLivreProductProvider,
        {
          provide: PlaywrightService,
          useValue: {
            openAuthenticatedPage,
          },
        },
      ],
    }).compile();

    provider = module.get<MercadoLivreProductProvider>(
      MercadoLivreProductProvider,
    );
  });

  it('normalizes Mercado Livre cards and ignores navigation links', () => {
    const product = normalizeMercadoLivreCard({
      href: 'https://www.mercadolivre.com.br/MLB-123',
      title: 'Rack Bancada Para Tv Até 75"',
      text: 'Rack Bancada Para Tv Até 75" R$ 249,90 4,8 1.842 avaliações 5.200 vendidos',
      imageUrl: 'https://http2.mlstatic.com/fake.webp',
      priceText: 'R$ 249,90',
      ratingText: '4,8',
      reviewsText: '1.842 avaliações',
      salesText: '5.200 vendidos',
    });

    expect(product).toEqual(
      expect.objectContaining<Partial<MarketplaceProduct>>({
        marketplace: Marketplace.MercadoLivre,
        title: 'Rack Bancada Para Tv Até 75"',
        originalUrl: 'https://www.mercadolivre.com.br/MLB-123',
        imageUrl: 'https://http2.mlstatic.com/fake.webp',
        price: 249.9,
        rating: 4.8,
        reviewsCount: 1842,
        salesCount: 5200,
      }),
    );

    expect(
      normalizeMercadoLivreCard({
        href: 'https://www.mercadolivre.com.br/afiliados/hub?is_affiliate=true#menu-user',
        title: 'Produtos selecionados para você',
        text: 'Produtos selecionados para você Procurar Filtrar',
      }),
    ).toBeNull();
  });

  it('extracts products from the hub page and respects filters', async () => {
    const page = createPage([
      {
        href: 'https://www.mercadolivre.com.br/MLB-123',
        title: 'Rack Bancada Para Tv Até 75"',
        text: 'Rack Bancada Para Tv Até 75" R$ 249,90 Eletronicos',
        imageUrl: 'https://http2.mlstatic.com/fake.webp',
        priceText: 'R$ 249,90',
      },
      {
        href: 'https://www.mercadolivre.com.br/MLB-456',
        title: 'Livro de marketing digital',
        text: 'Livro de marketing digital R$ 79,90 Livros',
        imageUrl: 'https://http2.mlstatic.com/fake-book.webp',
        priceText: 'R$ 79,90',
      },
    ]);

    usePage(page);

    await expect(
      provider.searchProducts({
        marketplace: Marketplace.MercadoLivre,
        query: 'rack',
        category: 'eletronicos',
        limit: 10,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        title: 'Rack Bancada Para Tv Até 75"',
        originalUrl: 'https://www.mercadolivre.com.br/MLB-123',
        price: 249.9,
      }),
    ]);

    expect(openAuthenticatedPage).toHaveBeenCalledWith(
      Marketplace.MercadoLivre,
      HUB_URL,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('returns normalized product details', async () => {
    const page = createPage([]);
    page.evaluate = jest.fn().mockResolvedValue({
      title: 'Rack Bancada Para Tv Até 75"',
      description: 'Rack robusto com entrega rápida',
      sellerName: 'Loja Oficial',
      availability: 'available',
      priceText: 'R$ 249,90',
      imageUrl: 'https://http2.mlstatic.com/detail.webp',
    });

    usePage(page);

    await expect(
      provider.getProductDetails('https://www.mercadolivre.com.br/MLB-123'),
    ).resolves.toEqual(
      expect.objectContaining({
        marketplace: Marketplace.MercadoLivre,
        title: 'Rack Bancada Para Tv Até 75"',
        availability: 'available',
        price: 249.9,
      }),
    );

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('parses prices with Brazilian formatting', () => {
    expect(parseMercadoLivrePrice('R$ 1.299,90')).toBe(1299.9);
    expect(parseMercadoLivrePrice('Sem preço')).toBeUndefined();
  });
});
