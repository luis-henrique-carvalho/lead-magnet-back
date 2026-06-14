import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';

import { AutomationTaskStatus } from '../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../shared/enums/automation-task-type.enum';
import { Marketplace } from '../../shared/enums/marketplace.enum';
import { AutomationTasksService } from '../automation-tasks/automation-tasks.service';
import { AutomationTaskDependenciesService } from '../automation-tasks/dependencies/automation-task-dependencies.service';
import { MarketplaceProductSearchesService } from '../marketplaces/searches/marketplace-product-searches.service';
import { AffiliateLinkCaptureService } from './affiliate-link-capture.service';
import {
  AFFILIATE_LINK_CAPTURE_QUEUE,
  AffiliateLinkCaptureJobData,
  CAPTURE_AFFILIATE_LINK_JOB,
} from './jobs/affiliate-link-capture.job';

describe('AffiliateLinkCaptureService', () => {
  let addJob: jest.MockedFunction<Queue<AffiliateLinkCaptureJobData>['add']>;
  let createTask: jest.MockedFunction<AutomationTasksService['create']>;
  let addDependency: jest.MockedFunction<
    AutomationTaskDependenciesService['add']
  >;
  let findSearch: jest.MockedFunction<
    MarketplaceProductSearchesService['findById']
  >;
  let service: AffiliateLinkCaptureService;

  beforeEach(async () => {
    addJob = jest.fn();
    createTask = jest.fn();
    addDependency = jest.fn();
    findSearch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateLinkCaptureService,
        {
          provide: getQueueToken(AFFILIATE_LINK_CAPTURE_QUEUE),
          useValue: { add: addJob },
        },
        {
          provide: AutomationTasksService,
          useValue: { create: createTask },
        },
        {
          provide: AutomationTaskDependenciesService,
          useValue: { add: addDependency },
        },
        {
          provide: MarketplaceProductSearchesService,
          useValue: { findById: findSearch },
        },
      ],
    }).compile();

    service = module.get(AffiliateLinkCaptureService);
  });

  it('creates an automation task and queues the affiliate link capture', async () => {
    createTask.mockResolvedValue({
      id: 'task-id',
      type: AutomationTaskType.AffiliateLinkCapture,
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

    const input = {
      productId: '550e8400-e29b-41d4-a716-446655440000',
      marketplace: Marketplace.Amazon,
      originalProductUrl: 'https://amazon.com.br/dp/B000000001',
    };

    await expect(service.capture(input)).resolves.toEqual({
      taskId: 'task-id',
      statusUrl: '/automation-tasks/task-id',
    });
    expect(createTask).toHaveBeenCalledWith({
      type: AutomationTaskType.AffiliateLinkCapture,
      marketplace: Marketplace.Amazon,
    });
    expect(addJob).toHaveBeenCalledWith(CAPTURE_AFFILIATE_LINK_JOB, {
      taskId: 'task-id',
      ...input,
    });
  });

  it('persists the search dependency before releasing the capture job', async () => {
    createTask.mockResolvedValue({
      id: 'capture-task-id',
      type: AutomationTaskType.AffiliateLinkCapture,
      marketplace: Marketplace.Amazon,
      status: AutomationTaskStatus.Pending,
      result: null,
      error: null,
      errorType: null,
      attempts: 0,
      startedAt: null,
      finishedAt: null,
      createdAt: new Date('2026-06-14T10:00:00.000Z'),
      updatedAt: new Date('2026-06-14T10:00:00.000Z'),
    });
    findSearch.mockResolvedValue({
      searchId: '550e8400-e29b-41d4-a716-446655440001',
      taskId: 'search-task-id',
      marketplace: Marketplace.Amazon,
      query: 'kindle',
      category: null,
      requestedLimit: 10,
      foundCount: 1,
      savedCount: 1,
      createdAt: new Date('2026-06-14T09:00:00.000Z'),
      completedAt: new Date('2026-06-14T09:01:00.000Z'),
    });

    await service.capture({
      searchId: '550e8400-e29b-41d4-a716-446655440001',
      productId: '550e8400-e29b-41d4-a716-446655440000',
      marketplace: Marketplace.Amazon,
      originalProductUrl: 'https://amazon.com.br/dp/B000000001',
    });

    expect(addDependency).toHaveBeenCalledWith(
      'search-task-id',
      'capture-task-id',
    );
    expect(addDependency.mock.invocationCallOrder[0]).toBeLessThan(
      addJob.mock.invocationCallOrder[0],
    );
    expect(addJob).toHaveBeenCalledWith(CAPTURE_AFFILIATE_LINK_JOB, {
      taskId: 'capture-task-id',
      productId: '550e8400-e29b-41d4-a716-446655440000',
      marketplace: Marketplace.Amazon,
      originalProductUrl: 'https://amazon.com.br/dp/B000000001',
    });
  });

  it('does not create a capture task when the origin search is missing', async () => {
    findSearch.mockRejectedValue(new Error('Marketplace search not found'));

    await expect(
      service.capture({
        searchId: '550e8400-e29b-41d4-a716-446655440001',
        productId: '550e8400-e29b-41d4-a716-446655440000',
        marketplace: Marketplace.Amazon,
        originalProductUrl: 'https://amazon.com.br/dp/B000000001',
      }),
    ).rejects.toThrow('Marketplace search not found');

    expect(createTask).not.toHaveBeenCalled();
    expect(addDependency).not.toHaveBeenCalled();
    expect(addJob).not.toHaveBeenCalled();
  });
});
