import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';

import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';
import { Marketplace } from '../../../shared/enums/marketplace.enum';
import { AutomationTasksService } from '../../automation-tasks/automation-tasks.service';
import { AffiliateLinkCaptureManualRequiredError } from '../errors/affiliate-link-capture-manual-required.error';
import { AffiliateLinkCaptureProviderRegistry } from '../providers/affiliate-link-capture-provider.registry';
import { AffiliateLinkCaptureProvider } from '../providers/affiliate-link-capture-provider.interface';
import { AffiliateLinkCaptureJobData } from './affiliate-link-capture.job';
import { AffiliateLinkCaptureProcessor } from './affiliate-link-capture.processor';
import { AffiliateLinkCaptureResultsService } from '../results/affiliate-link-capture-results.service';

describe('AffiliateLinkCaptureProcessor', () => {
  let processor: AffiliateLinkCaptureProcessor;
  let captureAffiliateLink: jest.MockedFunction<
    AffiliateLinkCaptureProvider['captureAffiliateLink']
  >;
  let getProvider: jest.MockedFunction<
    AffiliateLinkCaptureProviderRegistry['getProvider']
  >;
  let markProcessing: jest.MockedFunction<
    AutomationTasksService['markProcessing']
  >;
  let markCompleted: jest.MockedFunction<
    AutomationTasksService['markCompleted']
  >;
  let markFailed: jest.MockedFunction<AutomationTasksService['markFailed']>;
  let markManualRequired: jest.MockedFunction<
    AutomationTasksService['markManualRequired']
  >;
  let saveResult: jest.MockedFunction<
    AffiliateLinkCaptureResultsService['save']
  >;

  const jobData: AffiliateLinkCaptureJobData = {
    taskId: 'task-id',
    productId: '550e8400-e29b-41d4-a716-446655440000',
    marketplace: Marketplace.Amazon,
    originalProductUrl: 'https://amazon.com.br/dp/B000000001',
  };

  const createJob = (): Job<AffiliateLinkCaptureJobData> =>
    ({ data: jobData }) as Job<AffiliateLinkCaptureJobData>;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    captureAffiliateLink = jest.fn();
    getProvider = jest.fn().mockReturnValue({
      marketplaces: [Marketplace.Amazon],
      captureAffiliateLink,
    });
    markProcessing = jest.fn();
    markCompleted = jest.fn();
    markFailed = jest.fn();
    markManualRequired = jest.fn();
    saveResult = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateLinkCaptureProcessor,
        {
          provide: AffiliateLinkCaptureProviderRegistry,
          useValue: { getProvider },
        },
        {
          provide: AutomationTasksService,
          useValue: {
            markProcessing,
            markCompleted,
            markFailed,
            markManualRequired,
          },
        },
        {
          provide: AffiliateLinkCaptureResultsService,
          useValue: { save: saveResult },
        },
      ],
    }).compile();

    processor = module.get(AffiliateLinkCaptureProcessor);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls the provider and completes the task with the captured URL', async () => {
    captureAffiliateLink.mockResolvedValue({
      capturedAffiliateUrl: 'https://affiliate.example/link',
    });

    await expect(processor.process(createJob())).resolves.toEqual({
      productId: jobData.productId,
      marketplace: Marketplace.Amazon,
      originalProductUrl: jobData.originalProductUrl,
      capturedAffiliateUrl: 'https://affiliate.example/link',
    });
    expect(markProcessing).toHaveBeenCalledWith('task-id', 'task-id');
    expect(getProvider).toHaveBeenCalledWith(Marketplace.Amazon);
    expect(captureAffiliateLink).toHaveBeenCalledWith({
      productId: jobData.productId,
      marketplace: Marketplace.Amazon,
      originalProductUrl: jobData.originalProductUrl,
    });
    expect(saveResult).toHaveBeenCalledWith({
      taskId: 'task-id',
      productId: jobData.productId,
      marketplace: Marketplace.Amazon,
      originalProductUrl: jobData.originalProductUrl,
      capturedAffiliateUrl: 'https://affiliate.example/link',
    });
    expect(markCompleted).toHaveBeenCalledWith('task-id', 'task-id', {
      productId: jobData.productId,
      marketplace: Marketplace.Amazon,
      originalProductUrl: jobData.originalProductUrl,
      capturedAffiliateUrl: 'https://affiliate.example/link',
    });
  });

  it('maps expected manual errors to manual_required without retrying', async () => {
    captureAffiliateLink.mockRejectedValue(
      new AffiliateLinkCaptureManualRequiredError(
        'Authenticated session expired',
        AutomationErrorType.SessionInvalid,
      ),
    );

    await expect(processor.process(createJob())).resolves.toBeUndefined();
    expect(markManualRequired).toHaveBeenCalledWith(
      'task-id',
      'task-id',
      'Authenticated session expired',
      AutomationErrorType.SessionInvalid,
    );
    expect(markFailed).not.toHaveBeenCalled();
  });

  it('marks unexpected failures and rethrows for BullMQ retry', async () => {
    const error = new Error('Unexpected provider failure');
    captureAffiliateLink.mockRejectedValue(error);

    await expect(processor.process(createJob())).rejects.toBe(error);
    expect(markFailed).toHaveBeenCalledWith(
      'task-id',
      'task-id',
      'Unexpected provider failure',
      AutomationErrorType.InternalError,
    );
  });
});
