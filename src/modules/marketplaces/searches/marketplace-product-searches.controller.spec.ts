import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { MarketplaceProductSearchesController } from './marketplace-product-searches.controller';
import { MarketplaceProductSearchesService } from './marketplace-product-searches.service';

describe('MarketplaceProductSearchesController', () => {
  let app: INestApplication;
  let httpServer: Server;
  const service = {
    findById: jest.fn(),
    findProducts: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MarketplaceProductSearchesController],
      providers: [
        { provide: MarketplaceProductSearchesService, useValue: service },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => app.close());

  it('returns search parameters, counters and source task', async () => {
    const search = {
      searchId: 'search-id',
      taskId: 'task-id',
      marketplace: 'amazon',
      query: 'kindle',
      category: 'electronics',
      requestedLimit: 20,
      foundCount: 15,
      savedCount: 14,
      createdAt: '2026-06-14T10:00:00.000Z',
      completedAt: '2026-06-14T10:01:00.000Z',
    };
    service.findById.mockResolvedValue(search);

    await request(httpServer)
      .get('/marketplace-searches/search-id')
      .expect(200)
      .expect(search);

    expect(service.findById).toHaveBeenCalledWith('search-id');
  });

  it('returns products using validated database pagination', async () => {
    const response = { items: [], page: 2, limit: 5, total: 0 };
    service.findProducts.mockResolvedValue(response);

    await request(httpServer)
      .get('/marketplace-searches/search-id/products?page=2&limit=5')
      .expect(200)
      .expect(response);

    expect(service.findProducts).toHaveBeenCalledWith('search-id', {
      page: 2,
      limit: 5,
    });
  });

  it('rejects invalid pagination before calling the service', async () => {
    await request(httpServer)
      .get('/marketplace-searches/search-id/products?page=0&limit=101')
      .expect(400);

    expect(service.findProducts).not.toHaveBeenCalled();
  });

  it('returns 404 when the search does not exist', async () => {
    service.findProducts.mockRejectedValue(
      new NotFoundException('Marketplace search not found'),
    );

    await request(httpServer)
      .get('/marketplace-searches/missing/products')
      .expect(404);
  });
});
