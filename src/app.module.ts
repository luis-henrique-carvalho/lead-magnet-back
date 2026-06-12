import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';

import { auth } from './modules/auth/auth';
import { PrismaModule } from './infra/database/prisma/prisma.module';
import { MarketplacesModule } from './modules/marketplaces/marketplaces.module';
import { AutomationTasksModule } from './modules/automation-tasks/automation-tasks.module';
import { AffiliateLinkCaptureModule } from './modules/affiliate-link-capture/affiliate-link-capture.module';
import { BrowserModule } from './infra/browser';

const DEFAULT_REDIS_PORT = 6379;

function getRedisPort(configService: ConfigService): number {
  const configuredPort = Number(configService.get<string>('REDIS_PORT'));

  return Number.isInteger(configuredPort) &&
    configuredPort > 0 &&
    configuredPort <= 65535
    ? configuredPort
    : DEFAULT_REDIS_PORT;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: getRedisPort(configService),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),
    PrismaModule,
    BrowserModule,

    AuthModule.forRoot({
      auth,
      disableGlobalAuthGuard: true,
      bodyParser: {
        json: {
          limit: '2mb',
        },
        urlencoded: {
          enabled: true,
          extended: true,
          limit: '2mb',
        },
      },
    }),

    MarketplacesModule,
    AutomationTasksModule,
    AffiliateLinkCaptureModule,
  ],
})
export class AppModule {}
