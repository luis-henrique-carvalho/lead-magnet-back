import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { AutomationTaskDependenciesController } from './automation-task-dependencies.controller';
import { AutomationTaskDependenciesService } from './automation-task-dependencies.service';

describe('AutomationTaskDependenciesController', () => {
  let app: INestApplication;
  let httpServer: Server;
  const service = {
    add: jest.fn(),
    findDependencies: jest.fn(),
    findDependents: jest.fn(),
    findPending: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomationTaskDependenciesController],
      providers: [
        { provide: AutomationTaskDependenciesService, useValue: service },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    await app.close();
  });

  it('adds a dependency to a task', async () => {
    await request(httpServer)
      .post('/automation-tasks/successor-id/dependencies')
      .send({ predecessorTaskId: 'predecessor-id' })
      .expect(204);

    expect(service.add).toHaveBeenCalledWith('predecessor-id', 'successor-id');
  });

  it('returns pending dependencies', async () => {
    const dependencies = [{ predecessorId: 'predecessor-id' }];
    service.findPending.mockResolvedValue(dependencies);

    await request(httpServer)
      .get('/automation-tasks/successor-id/dependencies/pending')
      .expect(200)
      .expect(dependencies);

    expect(service.findPending).toHaveBeenCalledWith('successor-id');
  });

  it('returns all predecessors, including completed tasks', async () => {
    const dependencies = [
      {
        taskId: 'predecessor-id',
        type: 'marketplace_product_search',
        status: 'completed',
        direction: 'predecessor',
        required: true,
        createdAt: '2026-06-14T10:00:00.000Z',
      },
    ];
    service.findDependencies.mockResolvedValue(dependencies);

    await request(httpServer)
      .get('/automation-tasks/successor-id/dependencies')
      .expect(200)
      .expect(dependencies);

    expect(service.findDependencies).toHaveBeenCalledWith('successor-id');
  });

  it('returns all successors that depend on the task', async () => {
    service.findDependents.mockResolvedValue([]);

    await request(httpServer)
      .get('/automation-tasks/predecessor-id/dependents')
      .expect(200)
      .expect([]);

    expect(service.findDependents).toHaveBeenCalledWith('predecessor-id');
  });

  it('returns 404 when navigating dependencies of a missing task', async () => {
    service.findDependencies.mockRejectedValue(
      new NotFoundException('Automation task not found'),
    );

    await request(httpServer)
      .get('/automation-tasks/missing/dependencies')
      .expect(404);
  });
});
