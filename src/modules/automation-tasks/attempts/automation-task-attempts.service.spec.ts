import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AutomationTaskAttemptsRepository } from './automation-task-attempts.repository';
import { AutomationTaskAttemptsService } from './automation-task-attempts.service';

describe('AutomationTaskAttemptsService', () => {
  let service: AutomationTaskAttemptsService;
  const repository = { findByTaskId: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AutomationTaskAttemptsService,
        { provide: AutomationTaskAttemptsRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(AutomationTaskAttemptsService);
  });

  it('returns an empty page for an existing task without attempts', async () => {
    const page = { items: [], page: 1, limit: 20, total: 0 };
    repository.findByTaskId.mockResolvedValue(page);

    await expect(
      service.findByTaskId('task-id', { page: 1, limit: 20 }),
    ).resolves.toEqual(page);
  });

  it('throws 404 for a missing task', async () => {
    repository.findByTaskId.mockResolvedValue(null);

    await expect(
      service.findByTaskId('missing', { page: 1, limit: 20 }),
    ).rejects.toThrow(NotFoundException);
  });
});
