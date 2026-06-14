import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { Marketplace } from '../../shared/enums/marketplace.enum';
import { AffiliateLinkCaptureController } from './affiliate-link-capture.controller';
import { AffiliateLinkCaptureService } from './affiliate-link-capture.service';

describe('AffiliateLinkCaptureController', () => {
  let app: INestApplication;
  let httpServer: Server;
  let service: { capture: jest.Mock };

  beforeEach(async () => {
    service = { capture: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliateLinkCaptureController],
      providers: [{ provide: AffiliateLinkCaptureService, useValue: service }],
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

  afterEach(async () => {
    await app.close();
  });

  it('accepts a valid affiliate link capture request', async () => {
    const input = {
      productId: '550e8400-e29b-41d4-a716-446655440000',
      marketplace: Marketplace.MercadoLivre,
      originalProductUrl: 'https://produto.mercadolivre.com.br/MLB-123',
    };
    const response = {
      taskId: 'task-id',
      statusUrl: '/automation-tasks/task-id',
    };
    service.capture.mockResolvedValue(response);

    await request(httpServer)
      .post('/affiliate-link-capture')
      .send(input)
      .expect(201)
      .expect(response);

    expect(service.capture).toHaveBeenCalledWith(input);
  });

  it('rejects invalid input before calling the service', async () => {
    await request(httpServer)
      .post('/affiliate-link-capture')
      .send({
        productId: 'not-a-uuid',
        marketplace: 'invalid',
        originalProductUrl: 'not-a-url',
      })
      .expect(400);

    expect(service.capture).not.toHaveBeenCalled();
  });

  it('accepts a relational search origin', async () => {
    service.capture.mockResolvedValue({
      taskId: 'task-id',
      statusUrl: '/automation-tasks/task-id',
    });

    await request(httpServer)
      .post('/affiliate-link-capture')
      .send({
        searchId: '550e8400-e29b-41d4-a716-446655440001',
        productId: '550e8400-e29b-41d4-a716-446655440000',
        marketplace: Marketplace.Amazon,
        originalProductUrl: 'https://amazon.com.br/dp/B000000001',
      })
      .expect(201);

    expect(service.capture).toHaveBeenCalledWith(
      expect.objectContaining({
        searchId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    );
  });
});
