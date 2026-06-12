import {
  INestApplication,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { Marketplace } from '../../shared/enums/marketplace.enum';
import { MarketplacesController } from './marketplaces.controller';
import { MarketplacesService } from './marketplaces.service';

describe('MarketplacesController', () => {
  let app: INestApplication;
  let httpServer: Server;
  let service: { searchProducts: jest.Mock };

  beforeEach(async () => {
    service = {
      searchProducts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketplacesController],
      providers: [{ provide: MarketplacesService, useValue: service }],
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

  afterEach(async () => {
    await app.close();
  });

  it('delegates POST /marketplaces/search to the service', async () => {
    const products = [
      {
        marketplace: Marketplace.Amazon,
        title: 'Leitor digital',
        originalUrl: 'https://www.amazon.com.br/dp/example',
      },
    ];
    service.searchProducts.mockResolvedValue(products);

    await request(httpServer)
      .post('/marketplaces/search')
      .send({
        marketplace: Marketplace.Amazon,
        query: 'leitor',
        category: 'eletronicos',
        limit: 3,
      })
      .expect(201)
      .expect(products);

    expect(service.searchProducts).toHaveBeenCalledWith({
      marketplace: Marketplace.Amazon,
      query: 'leitor',
      category: 'eletronicos',
      limit: 3,
    });
  });

  it('applies the default limit', async () => {
    service.searchProducts.mockResolvedValue([]);

    await request(httpServer)
      .post('/marketplaces/search')
      .send({ marketplace: Marketplace.MercadoLivre })
      .expect(201)
      .expect([]);

    expect(service.searchProducts).toHaveBeenCalledWith({
      marketplace: Marketplace.MercadoLivre,
      limit: 10,
    });
  });

  it('rejects invalid input before calling the service', async () => {
    await request(httpServer)
      .post('/marketplaces/search')
      .send({ marketplace: 'invalid', limit: 0 })
      .expect(400);

    expect(service.searchProducts).not.toHaveBeenCalled();
  });

  it('returns HTTP 422 when the marketplace has no provider', async () => {
    service.searchProducts.mockRejectedValue(
      new UnprocessableEntityException('Marketplace not supported: shopee'),
    );

    await request(httpServer)
      .post('/marketplaces/search')
      .send({ marketplace: Marketplace.Shopee })
      .expect(422)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            message: 'Marketplace not supported: shopee',
            statusCode: 422,
          }),
        );
      });
  });
});
