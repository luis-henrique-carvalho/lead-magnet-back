import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';

import { AutomationTasksService } from '../automation-tasks/automation-tasks.service';
import { AutomationTaskStatus } from '../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../shared/enums/automation-task-type.enum';
import { Marketplace } from '../../shared/enums/marketplace.enum';
import {
  MARKETPLACE_PRODUCT_SEARCH_QUEUE,
  MarketplaceProductSearchJobData,
  SEARCH_PRODUCTS_JOB,
} from './jobs/marketplace-product-search.job';
import { MarketplacesService } from './marketplaces.service';

describe('MarketplacesService', () => {
  let addJob: jest.MockedFunction<
    Queue<MarketplaceProductSearchJobData>['add']
  >;
  let createTask: jest.MockedFunction<AutomationTasksService['create']>;
  let service: MarketplacesService;

  beforeEach(async () => {
    addJob = jest.fn();
    createTask = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplacesService,
        {
          provide: getQueueToken(MARKETPLACE_PRODUCT_SEARCH_QUEUE),
          useValue: { add: addJob },
        },
        {
          provide: AutomationTasksService,
          useValue: { create: createTask },
        },
      ],
    }).compile();

    service = module.get(MarketplacesService);
  });

  it('creates an automation task and queues the product search', async () => {
    createTask.mockResolvedValue({
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
    });

    const result = await service.searchProducts({
      marketplace: Marketplace.Amazon,
      query: 'leitor',
      category: 'eletronicos',
      limit: 3,
    });

    expect(createTask).toHaveBeenCalledWith({
      type: AutomationTaskType.MarketplaceProductSearch,
      marketplace: Marketplace.Amazon,
    });
    expect(addJob).toHaveBeenCalledWith(SEARCH_PRODUCTS_JOB, {
      taskId: 'task-id',
      searchId: result.searchId,
      marketplace: Marketplace.Amazon,
      query: 'leitor',
      category: 'eletronicos',
      limit: 3,
    });
    expect(result).toEqual({
      taskId: 'task-id',
      statusUrl: '/automation-tasks/task-id',
      searchId: result.searchId,
    });
    expect(result.searchId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
