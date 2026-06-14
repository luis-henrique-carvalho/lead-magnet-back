jest.mock('../../../infra/database/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { PrismaAutomationTaskAttemptsRepository } from './prisma-automation-task-attempts.repository';

describe('PrismaAutomationTaskAttemptsRepository', () => {
  const findTask = jest.fn();
  const countAttempts = jest.fn();
  const findAttempts = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    $transaction: transaction,
    automationTask: { findUnique: findTask },
    automationTaskAttempt: {
      count: countAttempts,
      findMany: findAttempts,
    },
  } as unknown as PrismaService;
  const repository = new PrismaAutomationTaskAttemptsRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    findTask.mockResolvedValue({ id: 'task-id' });
  });

  it('paginates attempts in deterministic newest-first order', async () => {
    const startedAt = new Date('2026-06-14T10:00:00.000Z');
    const attempt = {
      number: 3,
      jobId: 'job-3',
      status: 'failed',
      error: 'timeout',
      errorType: 'timeout',
      metadata: { retry: true },
      startedAt,
      finishedAt: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    transaction.mockResolvedValue([3, [attempt]]);

    await expect(
      repository.findByTaskId('task-id', { page: 2, limit: 2 }),
    ).resolves.toEqual({
      items: [attempt],
      page: 2,
      limit: 2,
      total: 3,
    });

    expect(findAttempts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskId: 'task-id' },
        skip: 2,
        take: 2,
        orderBy: [{ startedAt: 'desc' }, { number: 'desc' }],
      }),
    );
  });

  it('returns null without querying attempts when the task does not exist', async () => {
    findTask.mockResolvedValue(null);

    await expect(
      repository.findByTaskId('missing', { page: 1, limit: 20 }),
    ).resolves.toBeNull();

    expect(transaction).not.toHaveBeenCalled();
  });
});
