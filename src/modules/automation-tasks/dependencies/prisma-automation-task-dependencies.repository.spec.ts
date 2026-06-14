jest.mock('../../../infra/database/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { AddAutomationTaskDependencyResult } from './automation-task-dependencies.repository';
import { PrismaAutomationTaskDependenciesRepository } from './prisma-automation-task-dependencies.repository';

describe('PrismaAutomationTaskDependenciesRepository', () => {
  const queryRaw = jest.fn();
  const findTasks = jest.fn();
  const findDependency = jest.fn();
  const findLinks = jest.fn();
  const createDependency = jest.fn();
  const transactionClient = {
    $queryRaw: queryRaw,
    automationTask: { findMany: findTasks },
    automationTaskDependency: {
      findUnique: findDependency,
      findMany: findLinks,
      create: createDependency,
    },
  };
  const transaction = jest.fn(
    (callback: (client: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  const repository = new PrismaAutomationTaskDependenciesRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    queryRaw.mockResolvedValue([{ pg_advisory_xact_lock: null }]);
    findTasks.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    findDependency.mockResolvedValue(null);
    findLinks.mockResolvedValue([]);
    createDependency.mockResolvedValue({ id: 'dependency-id' });
  });

  it('locks, validates and creates the dependency in one transaction', async () => {
    await expect(repository.add('a', 'b')).resolves.toBe(
      AddAutomationTaskDependencyResult.Created,
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(createDependency).toHaveBeenCalledWith({
      data: { predecessorId: 'a', successorId: 'b' },
    });
    expect(queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      findTasks.mock.invocationCallOrder[0],
    );
  });

  it('rejects a dependency when the inverse path already exists', async () => {
    findLinks.mockResolvedValueOnce([{ successorId: 'a' }]);

    await expect(repository.add('a', 'b')).resolves.toBe(
      AddAutomationTaskDependencyResult.CreatesCycle,
    );

    expect(createDependency).not.toHaveBeenCalled();
  });

  it('rejects missing tasks while holding the graph lock', async () => {
    findTasks.mockResolvedValue([{ id: 'a' }]);

    await expect(repository.add('a', 'missing')).resolves.toBe(
      AddAutomationTaskDependencyResult.TaskNotFound,
    );

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(findDependency).not.toHaveBeenCalled();
    expect(createDependency).not.toHaveBeenCalled();
  });
});
