import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { AutomationTaskAttemptsController } from './automation-task-attempts.controller';
import { AutomationTaskAttemptsService } from './automation-task-attempts.service';

describe('AutomationTaskAttemptsController', () => {
  let app: INestApplication;
  let httpServer: Server;
  const service = { findByTaskId: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AutomationTaskAttemptsController],
      providers: [
        { provide: AutomationTaskAttemptsService, useValue: service },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => app.close());

  it('returns the paginated attempt history of a task', async () => {
    const response = {
      items: [
        {
          number: 2,
          jobId: 'job-2',
          status: 'failed',
          error: 'timeout',
          errorType: 'timeout',
          metadata: { retry: true },
          startedAt: '2026-06-14T10:00:00.000Z',
          finishedAt: '2026-06-14T10:01:00.000Z',
          createdAt: '2026-06-14T10:00:00.000Z',
          updatedAt: '2026-06-14T10:01:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    };
    service.findByTaskId.mockResolvedValue(response);

    await request(httpServer)
      .get('/automation-tasks/task-id/attempts')
      .expect(200)
      .expect(response);

    expect(service.findByTaskId).toHaveBeenCalledWith('task-id', {
      page: 1,
      limit: 20,
    });
  });

  it('rejects invalid pagination before calling the service', async () => {
    await request(httpServer)
      .get('/automation-tasks/task-id/attempts?page=0&limit=101')
      .expect(400);

    expect(service.findByTaskId).not.toHaveBeenCalled();
  });

  it('returns 404 when the task does not exist', async () => {
    service.findByTaskId.mockRejectedValue(
      new NotFoundException('Automation task not found'),
    );

    await request(httpServer)
      .get('/automation-tasks/missing/attempts')
      .expect(404);
  });
});
