import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';

import { AutomationTaskStatus } from '../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../shared/enums/automation-task-type.enum';
import { Marketplace } from '../../shared/enums/marketplace.enum';
import {
  MARKETPLACE_PRODUCT_SEARCH_QUEUE,
  MarketplaceProductSearchJobData,
  SEARCH_PRODUCTS_JOB,
} from './jobs/marketplace-product-search/marketplace-product-search.job';
import { MarketplacesService } from './marketplaces.service';
import { MarketplaceProductSearchesService } from './searches/marketplace-product-searches.service';

describe('MarketplacesService', () => {
  let addJob: jest.MockedFunction<
    Queue<MarketplaceProductSearchJobData>['add']
  >;
  let createSearch: jest.MockedFunction<
    MarketplaceProductSearchesService['create']
  >;
  let service: MarketplacesService;

  beforeEach(async () => {
    addJob = jest.fn();
    createSearch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplacesService,
        {
          provide: getQueueToken(MARKETPLACE_PRODUCT_SEARCH_QUEUE),
          useValue: { add: addJob },
        },
        {
          provide: MarketplaceProductSearchesService,
          useValue: { create: createSearch },
        },
      ],
    }).compile();

    service = module.get(MarketplacesService);
  });

  it('creates an automation task and queues the product search', async () => {
    createSearch.mockResolvedValue({
      id: 'search-id',
      task: {
        id: 'task-id',
        type: AutomationTaskType.MarketplaceProductSearch,
        marketplace: Marketplace.Amazon,
        status: AutomationTaskStatus.Pending,
        result: null,
        error: null,
        errorType: null,
        attempts: 0,
        startedAt: null,
        finishedAt: null,
        createdAt: new Date('2026-06-12T00:00:00.000Z'),
        updatedAt: new Date('2026-06-12T00:00:00.000Z'),
      },
    });

    const result = await service.searchProducts({
      marketplace: Marketplace.Amazon,
      query: 'leitor',
      category: 'eletronicos',
      limit: 3,
    });

    expect(createSearch).toHaveBeenCalledWith({
      marketplace: Marketplace.Amazon,
      query: 'leitor',
      category: 'eletronicos',
      limit: 3,
    });
    expect(addJob).toHaveBeenCalledWith(SEARCH_PRODUCTS_JOB, {
      taskId: 'task-id',
      searchId: 'search-id',
      marketplace: Marketplace.Amazon,
      query: 'leitor',
      category: 'eletronicos',
      limit: 3,
    });
    expect(result).toEqual({
      taskId: 'task-id',
      statusUrl: '/automation-tasks/task-id',
      searchId: 'search-id',
    });
  });
});
