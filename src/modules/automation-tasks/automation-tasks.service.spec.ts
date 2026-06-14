import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AutomationErrorType } from '../../shared/enums/automation-error-type.enum';
import { AutomationTaskStatus } from '../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../shared/enums/automation-task-type.enum';
import { AutomationTask } from './automation-task.types';
import { AutomationTasksRepository } from './automation-tasks.repository';
import { AutomationTasksService } from './automation-tasks.service';

describe('AutomationTasksService', () => {
  let repository: jest.Mocked<AutomationTasksRepository>;
  let service: AutomationTasksService;
  let createTask: jest.MockedFunction<AutomationTasksRepository['create']>;
  let findTaskById: jest.MockedFunction<AutomationTasksRepository['findById']>;
  let startAttempt: jest.MockedFunction<
    AutomationTasksRepository['startAttempt']
  >;
  let finishAttempt: jest.MockedFunction<
    AutomationTasksRepository['finishAttempt']
  >;

  const task = (overrides: Partial<AutomationTask> = {}): AutomationTask => ({
    id: 'task-id',
    type: AutomationTaskType.MarketplaceProductSearch,
    marketplace: 'amazon',
    status: AutomationTaskStatus.Pending,
    result: null,
    error: null,
    errorType: null,
    attempts: 0,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date('2026-06-12T00:00:00.000Z'),
    updatedAt: new Date('2026-06-12T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    createTask = jest.fn<
      ReturnType<AutomationTasksRepository['create']>,
      Parameters<AutomationTasksRepository['create']>
    >();
    findTaskById = jest.fn<
      ReturnType<AutomationTasksRepository['findById']>,
      Parameters<AutomationTasksRepository['findById']>
    >();
    startAttempt = jest.fn<
      ReturnType<AutomationTasksRepository['startAttempt']>,
      Parameters<AutomationTasksRepository['startAttempt']>
    >();
    finishAttempt = jest.fn<
      ReturnType<AutomationTasksRepository['finishAttempt']>,
      Parameters<AutomationTasksRepository['finishAttempt']>
    >();
    repository = {
      create: createTask,
      findById: findTaskById,
      startAttempt,
      finishAttempt,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationTasksService,
        { provide: AutomationTasksRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(AutomationTasksService);
  });

  it('creates a pending task', async () => {
    createTask.mockResolvedValue(task());

    const result = await service.create({
      type: AutomationTaskType.MarketplaceProductSearch,
      marketplace: 'amazon',
    });

    expect(createTask).toHaveBeenCalledWith({
      type: AutomationTaskType.MarketplaceProductSearch,
      marketplace: 'amazon',
    });
    expect(result.status).toBe(AutomationTaskStatus.Pending);
  });

  it('returns a task with its status URL', async () => {
    findTaskById.mockResolvedValue(task({ result: { products: 2 } }));

    await expect(service.findById('task-id')).resolves.toEqual(
      expect.objectContaining({
        id: 'task-id',
        status: AutomationTaskStatus.Pending,
        statusUrl: '/automation-tasks/task-id',
        result: { products: 2 },
        error: null,
        errorType: null,
      }),
    );
  });

  it('projects a relational marketplace search as the public result', async () => {
    findTaskById.mockResolvedValue(
      task({
        result: { legacy: true },
        marketplaceSearch: {
          id: 'search-id',
          marketplace: 'amazon',
          query: 'leitor',
          category: null,
          requestedLimit: 2,
          foundCount: 1,
          savedCount: 1,
          completedAt: new Date('2026-06-12T00:01:00.000Z'),
          results: [
            {
              discoveredAt: new Date('2026-06-12T00:00:30.000Z'),
              product: { id: 'product-id', title: 'Leitor digital' },
            },
          ],
        },
      }),
    );

    const response = await service.findById('task-id');

    expect(response.result).toEqual(
      expect.objectContaining({
        searchId: 'search-id',
        requestedCount: 2,
        products: [
          expect.objectContaining({
            id: 'product-id',
            title: 'Leitor digital',
          }),
        ],
      }),
    );
  });

  it('marks a task as processing and increments attempts', async () => {
    startAttempt.mockResolvedValue(
      task({ status: AutomationTaskStatus.Processing, attempts: 1 }),
    );

    const result = await service.markProcessing('task-id', 'job-id');

    expect(startAttempt).toHaveBeenCalledWith('task-id', {
      jobId: 'job-id',
      metadata: undefined,
    });
    expect(result.status).toBe(AutomationTaskStatus.Processing);
  });

  type TransitionCase = {
    method: string;
    call: (instance: AutomationTasksService) => Promise<AutomationTask>;
    status: AutomationTaskStatus;
  };

  it.each<TransitionCase>([
    {
      method: 'markCompleted' as const,
      call: (instance: AutomationTasksService) =>
        instance.markCompleted('task-id', 'job-id', { products: 2 }),
      status: AutomationTaskStatus.Completed,
    },
    {
      method: 'markPartial' as const,
      call: (instance: AutomationTasksService) =>
        instance.markPartial(
          'task-id',
          'job-id',
          { products: 1 },
          'One item failed',
        ),
      status: AutomationTaskStatus.Partial,
    },
    {
      method: 'markFailed' as const,
      call: (instance: AutomationTasksService) =>
        instance.markFailed(
          'task-id',
          'job-id',
          'Provider unavailable',
          AutomationErrorType.UpstreamError,
        ),
      status: AutomationTaskStatus.Failed,
    },
    {
      method: 'markManualRequired' as const,
      call: (instance: AutomationTasksService) =>
        instance.markManualRequired('task-id', 'job-id', 'CAPTCHA required'),
      status: AutomationTaskStatus.ManualRequired,
    },
  ])('supports the $method transition', async ({ call, status }) => {
    finishAttempt.mockResolvedValue(task({ status }));

    await call(service);

    expect(finishAttempt).toHaveBeenCalledWith(
      'task-id',
      'job-id',
      expect.objectContaining({
        status,
      }),
    );
    expect(finishAttempt.mock.calls[0][2].finishedAt).toBeInstanceOf(Date);
  });

  it('uses manual_required as the default manual error type', async () => {
    finishAttempt.mockResolvedValue(
      task({ status: AutomationTaskStatus.ManualRequired }),
    );

    await service.markManualRequired('task-id', 'job-id', 'CAPTCHA required');

    expect(finishAttempt).toHaveBeenCalledWith(
      'task-id',
      'job-id',
      expect.objectContaining({
        errorType: AutomationErrorType.ManualRequired,
      }),
    );
  });

  it('throws HTTP 404 when the task does not exist', async () => {
    findTaskById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
