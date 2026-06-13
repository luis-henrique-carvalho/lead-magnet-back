import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: new ConsoleLogger({
      timestamp: true,
    }),
  });

  app.enableShutdownHooks();

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const openApiConfig = new DocumentBuilder()
    .setTitle('Lead Magnet API')
    .setDescription('API da aplicacao Lead Magnet')
    .setOpenAPIVersion('3.1.1')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('better-auth.session_token')
    .build();

  const openApiDocumentFactory = () =>
    SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('api', app, openApiDocumentFactory, {
    customSiteTitle: 'Lead Magnet API Docs',
    explorer: true,
    jsonDocumentUrl: 'api-json',
    swaggerOptions: {
      persistAuthorization: true,
      urls: [
        {
          name: 'Lead Magnet API',
          url: '/api-json',
        },
        {
          name: 'Better Auth API',
          url: '/api/auth/open-api/generate-schema',
        },
      ],
    },
    yamlDocumentUrl: 'api-yaml',
  });

  app.use(
    '/reference',
    apiReference({
      pageTitle: 'Lead Magnet API Reference',
      sources: [
        {
          title: 'Lead Magnet API',
          slug: 'lead-magnet',
          url: '/api-json',
          default: true,
        },
        {
          title: 'Better Auth API',
          slug: 'better-auth',
          url: '/api/auth/open-api/generate-schema',
        },
      ],
      theme: 'default',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((error: unknown) => {
  const logger = new ConsoleLogger('Bootstrap');
  const trace = error instanceof Error ? error.stack : String(error);

  logger.error('Failed to start application', trace);
  process.exitCode = 1;
});
