import {
  ConflictException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { MarketplaceSearchResultsController } from './marketplace-search-results.controller';
import { MarketplaceSearchResultsService } from './marketplace-search-results.service';

describe('MarketplaceSearchResultsController', () => {
  let app: INestApplication;
  let httpServer: Server;
  const service = { findOriginTask: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MarketplaceSearchResultsController],
      providers: [
        { provide: MarketplaceSearchResultsService, useValue: service },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => app.close());

  it('navigates from a discovery result to its search and origin task', async () => {
    const response = {
      resultId: 'result-id',
      search: {
        searchId: 'search-id',
        marketplace: 'amazon',
        query: 'kindle',
        category: null,
      },
      task: {
        taskId: 'task-id',
        type: 'marketplace_product_search',
        status: 'completed',
        marketplace: 'amazon',
        createdAt: '2026-06-14T10:00:00.000Z',
        finishedAt: '2026-06-14T10:01:00.000Z',
      },
    };
    service.findOriginTask.mockResolvedValue(response);

    await request(httpServer)
      .get('/marketplace-search-results/result-id/task')
      .expect(200)
      .expect(response);

    expect(service.findOriginTask).toHaveBeenCalledWith('result-id');
  });

  it('returns 404 when the result does not exist', async () => {
    service.findOriginTask.mockRejectedValue(
      new NotFoundException('Marketplace search result not found'),
    );

    await request(httpServer)
      .get('/marketplace-search-results/missing/task')
      .expect(404);
  });

  it('returns 409 when a legacy result has no relational search', async () => {
    service.findOriginTask.mockRejectedValue(
      new ConflictException('Legacy result has no relational origin task'),
    );

    await request(httpServer)
      .get('/marketplace-search-results/legacy-result/task')
      .expect(409);
  });
});
