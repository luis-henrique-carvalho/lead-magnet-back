import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { MarketplaceProductsController } from './marketplace-products.controller';
import { MarketplaceProductsService } from './marketplace-products.service';

describe('MarketplaceProductsController', () => {
  let app: INestApplication;
  let httpServer: Server;
  const service = { findSearches: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MarketplaceProductsController],
      providers: [{ provide: MarketplaceProductsService, useValue: service }],
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

  it('returns paginated relational search recurrence', async () => {
    const response = {
      items: [],
      page: 1,
      limit: 10,
      total: 0,
      legacyAssociationsExcluded: true,
    };
    service.findSearches.mockResolvedValue(response);

    await request(httpServer)
      .get('/marketplace-products/product-id/searches?limit=10')
      .expect(200)
      .expect(response);

    expect(service.findSearches).toHaveBeenCalledWith('product-id', {
      page: 1,
      limit: 10,
    });
  });

  it('returns 404 when the canonical product does not exist', async () => {
    service.findSearches.mockRejectedValue(
      new NotFoundException('Marketplace product not found'),
    );

    await request(httpServer)
      .get('/marketplace-products/missing/searches')
      .expect(404);
  });

  it('rejects invalid pagination', async () => {
    await request(httpServer)
      .get('/marketplace-products/product-id/searches?page=-1')
      .expect(400);

    expect(service.findSearches).not.toHaveBeenCalled();
  });
});
