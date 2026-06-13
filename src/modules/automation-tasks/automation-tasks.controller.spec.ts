import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import { AutomationTaskStatus } from '../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../shared/enums/automation-task-type.enum';
import { AutomationTasksController } from './automation-tasks.controller';
import { AutomationTasksService } from './automation-tasks.service';

describe('AutomationTasksController', () => {
  let app: INestApplication;
  let httpServer: Server;
  let service: { findById: jest.Mock };

  beforeEach(async () => {
    service = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomationTasksController],
      providers: [{ provide: AutomationTasksService, useValue: service }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the task status and public result fields', async () => {
    const response = {
      id: 'task-id',
      type: AutomationTaskType.MarketplaceProductSearch,
      marketplace: 'amazon',
      status: AutomationTaskStatus.Completed,
      statusUrl: '/automation-tasks/task-id',
      result: { products: 2 },
      error: null,
      errorType: null,
      attempts: 1,
      startedAt: '2026-06-12T00:00:00.000Z',
      finishedAt: '2026-06-12T00:01:00.000Z',
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:01:00.000Z',
    };
    service.findById.mockResolvedValue(response);

    await request(httpServer)
      .get('/automation-tasks/task-id')
      .expect(200)
      .expect(response);

    expect(service.findById).toHaveBeenCalledWith('task-id');
  });

  it('returns HTTP 404 when the task does not exist', async () => {
    service.findById.mockRejectedValue(
      new NotFoundException('Automation task not found: missing'),
    );

    await request(httpServer).get('/automation-tasks/missing').expect(404);
  });
});
