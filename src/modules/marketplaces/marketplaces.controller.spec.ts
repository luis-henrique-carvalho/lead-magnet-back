import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    const response = {
      taskId: 'task-id',
      statusUrl: '/automation-tasks/task-id',
      searchId: 'search-id',
    };
    service.searchProducts.mockResolvedValue(response);

    await request(httpServer)
      .post('/marketplaces/search')
      .send({
        marketplace: Marketplace.Amazon,
        query: 'leitor',
        category: 'eletronicos',
        limit: 3,
      })
      .expect(201)
      .expect(response);

    expect(service.searchProducts).toHaveBeenCalledWith({
      marketplace: Marketplace.Amazon,
      query: 'leitor',
      category: 'eletronicos',
      limit: 3,
    });
  });

  it('applies the default limit', async () => {
    service.searchProducts.mockResolvedValue({
      taskId: 'task-id',
      statusUrl: '/automation-tasks/task-id',
      searchId: 'search-id',
    });

    await request(httpServer)
      .post('/marketplaces/search')
      .send({ marketplace: Marketplace.MercadoLivre })
      .expect(201);

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
});
