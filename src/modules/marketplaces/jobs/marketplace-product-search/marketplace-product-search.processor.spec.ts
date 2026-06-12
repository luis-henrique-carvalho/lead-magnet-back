import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';

import { AutomationTasksService } from '../../../automation-tasks/automation-tasks.service';
import { AutomationErrorType } from '../../../../shared/enums/automation-error-type.enum';
import { Marketplace } from '../../../../shared/enums/marketplace.enum';
import { MarketplaceProductProviderRegistry } from '../../providers/marketplace-product-provider.registry';
import { MarketplaceProductSearchProvider } from '../../providers/marketplace-product-search-provider.interface';
import { MarketplaceProductsService } from '../../products/marketplace-products.service';
import { MarketplaceProductSearchJobData } from './marketplace-product-search.job';
import { MarketplaceProductSearchProcessor } from './marketplace-product-search.processor';

describe('MarketplaceProductSearchProcessor', () => {
  let processor: MarketplaceProductSearchProcessor;
  let provider: jest.Mocked<MarketplaceProductSearchProvider>;
  let searchProducts: jest.MockedFunction<
    MarketplaceProductSearchProvider['searchProducts']
  >;
  let getProvider: jest.MockedFunction<
    MarketplaceProductProviderRegistry['getProvider']
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
  let saveSearchResults: jest.MockedFunction<
    MarketplaceProductsService['saveSearchResults']
  >;

  const jobData: MarketplaceProductSearchJobData = {
    taskId: 'task-id',
    searchId: 'search-id',
    marketplace: Marketplace.Amazon,
    query: 'leitor',
    category: 'eletronicos',
    limit: 3,
  };

  const createJob = (): Job<MarketplaceProductSearchJobData> =>
    ({ data: jobData }) as Job<MarketplaceProductSearchJobData>;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    searchProducts = jest.fn();
    provider = {
      marketplace: Marketplace.Amazon,
      searchProducts,
      getProductDetails: jest.fn(),
    };
    getProvider = jest.fn().mockReturnValue(provider);
    markProcessing = jest.fn();
    markCompleted = jest.fn();
    markFailed = jest.fn();
    markManualRequired = jest.fn();
    saveSearchResults = jest.fn().mockResolvedValue(2);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceProductSearchProcessor,
        {
          provide: MarketplaceProductProviderRegistry,
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
          provide: MarketplaceProductsService,
          useValue: { saveSearchResults },
        },
      ],
    }).compile();

    processor = module.get(MarketplaceProductSearchProcessor);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls the selected provider and completes the task with result counters', async () => {
    const products = [
      {
        externalId: 'AMZ-1',
        marketplace: Marketplace.Amazon,
        title: 'Leitor digital',
        originalUrl: 'https://amazon.com.br/dp/AMZ-1',
      },
      {
        externalId: 'AMZ-2',
        marketplace: Marketplace.Amazon,
        title: 'Leitor digital premium',
        originalUrl: 'https://amazon.com.br/dp/AMZ-2',
      },
    ];
    searchProducts.mockResolvedValue(products);

    await expect(processor.process(createJob())).resolves.toEqual({
      searchId: 'search-id',
      requestedCount: 3,
      foundCount: 2,
      savedCount: 2,
    });
    expect(markProcessing).toHaveBeenCalledWith('task-id');
    expect(getProvider).toHaveBeenCalledWith(Marketplace.Amazon);
    expect(searchProducts).toHaveBeenCalledWith({
      marketplace: Marketplace.Amazon,
      query: 'leitor',
      category: 'eletronicos',
      limit: 3,
    });
    expect(saveSearchResults).toHaveBeenCalledWith('search-id', products);
    expect(markCompleted).toHaveBeenCalledWith('task-id', {
      searchId: 'search-id',
      requestedCount: 3,
      foundCount: 2,
      savedCount: 2,
    });
    expect(saveSearchResults.mock.invocationCallOrder[0]).toBeLessThan(
      markCompleted.mock.invocationCallOrder[0],
    );
  });

  it('maps CAPTCHA errors to manual_required without retrying the job', async () => {
    searchProducts.mockRejectedValue(new Error('CAPTCHA_REQUIRED'));

    await expect(processor.process(createJob())).resolves.toBeUndefined();
    expect(markManualRequired).toHaveBeenCalledWith(
      'task-id',
      'CAPTCHA_REQUIRED',
      AutomationErrorType.CaptchaRequired,
    );
    expect(markFailed).not.toHaveBeenCalled();
    expect(saveSearchResults).not.toHaveBeenCalled();
  });

  it('maps timeout errors to failed and rethrows for BullMQ retry', async () => {
    const error = Object.assign(new Error('Provider request failed'), {
      code: 'ETIMEDOUT',
    });
    searchProducts.mockRejectedValue(error);

    await expect(processor.process(createJob())).rejects.toBe(error);
    expect(markFailed).toHaveBeenCalledWith(
      'task-id',
      'Provider request failed',
      AutomationErrorType.Timeout,
    );
  });

  it('maps generic errors to internal_error and rethrows for BullMQ retry', async () => {
    const error = new Error('Unexpected provider failure');
    searchProducts.mockRejectedValue(error);

    await expect(processor.process(createJob())).rejects.toBe(error);
    expect(markFailed).toHaveBeenCalledWith(
      'task-id',
      'Unexpected provider failure',
      AutomationErrorType.InternalError,
    );
  });
});
