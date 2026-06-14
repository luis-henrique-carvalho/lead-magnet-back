import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceProductSearchesService } from './marketplace-product-searches.service';
import { MarketplaceProductSearchesRepository } from './marketplace-product-searches.repository';
import { AutomationTaskEventsPublisher } from '../../automation-tasks/events/interfaces/automation-task-events.publisher';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';
import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';
import { AutomationTask } from '../../automation-tasks/automation-task.types';

describe('MarketplaceProductSearchesService', () => {
  let service: MarketplaceProductSearchesService;
  let repository: jest.Mocked<MarketplaceProductSearchesRepository>;
  let publisher: jest.Mocked<AutomationTaskEventsPublisher>;

  const fakeTask = (
    overrides: Partial<AutomationTask> = {},
  ): AutomationTask => ({
    id: 'task-id',
    type: AutomationTaskType.MarketplaceProductSearch,
    marketplace: 'amazon',
    status: AutomationTaskStatus.Pending,
    updatedAt: new Date('2026-06-14T12:00:00.000Z'),
    result: null,
    error: null,
    errorType: null,
    attempts: 0,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date('2026-06-14T12:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    repository = {
      createWithTask: jest.fn(),
      findById: jest.fn(),
      findProducts: jest.fn(),
      findAffiliateLinkCaptureTasks: jest.fn(),
    };

    publisher = {
      publish: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceProductSearchesService,
        { provide: MarketplaceProductSearchesRepository, useValue: repository },
        { provide: AutomationTaskEventsPublisher, useValue: publisher },
      ],
    }).compile();

    service = module.get<MarketplaceProductSearchesService>(
      MarketplaceProductSearchesService,
    );
  });

  describe('create', () => {
    it('creates search and task, publishes task.created event, and returns search details', async () => {
      const input = {
        marketplace: 'amazon',
        query: 'kindle',
        category: 'books',
        limit: 10,
      };

      const task = fakeTask();
      const mockResult = { id: 'search-id', task };

      repository.createWithTask.mockResolvedValue(mockResult);

      const result = await service.create(input);

      expect(repository.createWithTask).toHaveBeenCalledWith(input);
      expect(publisher.publish).toHaveBeenCalledWith('task.created', {
        id: 'task-id',
        type: AutomationTaskType.MarketplaceProductSearch,
        status: AutomationTaskStatus.Pending,
        marketplace: 'amazon',
        updatedAt: task.updatedAt,
        searchId: 'search-id',
      });
      expect(result).toEqual(mockResult);
    });

    it('does not fail the operation if publisher throws an error', async () => {
      const input = {
        marketplace: 'amazon',
        limit: 10,
      };

      const task = fakeTask();
      const mockResult = { id: 'search-id', task };

      repository.createWithTask.mockResolvedValue(mockResult);
      publisher.publish.mockRejectedValue(new Error('Redis failure'));

      const result = await service.create(input);

      expect(repository.createWithTask).toHaveBeenCalledWith(input);
      expect(publisher.publish).toHaveBeenCalled();
      expect(result).toEqual(mockResult); // Operation succeeds despite publisher failure
    });
  });
});
