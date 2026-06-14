import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  AddAutomationTaskDependencyResult,
  AutomationTaskDependenciesRepository,
} from './automation-task-dependencies.repository';
import { AutomationTaskDependenciesService } from './automation-task-dependencies.service';

describe('AutomationTaskDependenciesService', () => {
  let service: AutomationTaskDependenciesService;
  let repository: jest.Mocked<AutomationTaskDependenciesRepository>;
  let addDependency: jest.Mock;

  beforeEach(async () => {
    addDependency = jest
      .fn()
      .mockResolvedValue(AddAutomationTaskDependencyResult.Created);
    repository = {
      add: addDependency,
      findDependencies: jest.fn(),
      findDependents: jest.fn(),
      findPending: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationTaskDependenciesService,
        {
          provide: AutomationTaskDependenciesRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(AutomationTaskDependenciesService);
  });

  it('creates a directed dependency between existing tasks', async () => {
    await service.add('predecessor-id', 'successor-id');

    expect(addDependency).toHaveBeenCalledWith(
      'predecessor-id',
      'successor-id',
    );
  });

  it('rejects self references', async () => {
    await expect(service.add('task-id', 'task-id')).rejects.toThrow(
      BadRequestException,
    );
    expect(addDependency).not.toHaveBeenCalled();
  });

  it('rejects missing tasks', async () => {
    addDependency.mockResolvedValue(
      AddAutomationTaskDependencyResult.TaskNotFound,
    );

    await expect(service.add('missing-id', 'successor-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects duplicate dependencies', async () => {
    addDependency.mockResolvedValue(
      AddAutomationTaskDependencyResult.AlreadyExists,
    );

    await expect(service.add('predecessor-id', 'successor-id')).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects dependencies that create a cycle', async () => {
    addDependency.mockResolvedValue(
      AddAutomationTaskDependencyResult.CreatesCycle,
    );

    await expect(service.add('predecessor-id', 'successor-id')).rejects.toThrow(
      ConflictException,
    );
  });

  it('returns dependency navigation for an existing task', async () => {
    repository.findDependencies.mockResolvedValue([]);

    await expect(service.findDependencies('task-id')).resolves.toEqual([]);
  });

  it('rejects dependency navigation for a missing task', async () => {
    repository.findDependencies.mockResolvedValue(null);

    await expect(service.findDependencies('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns dependent navigation for an existing task', async () => {
    repository.findDependents.mockResolvedValue([]);

    await expect(service.findDependents('task-id')).resolves.toEqual([]);
  });
});
