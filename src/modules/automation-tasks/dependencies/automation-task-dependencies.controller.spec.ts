import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { AutomationTaskDependenciesController } from './automation-task-dependencies.controller';
import { AutomationTaskDependenciesService } from './automation-task-dependencies.service';

describe('AutomationTaskDependenciesController', () => {
  let app: INestApplication;
  let httpServer: Server;
  const service = { add: jest.fn(), findPending: jest.fn() };

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
});
