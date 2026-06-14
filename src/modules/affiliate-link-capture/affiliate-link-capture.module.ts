import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { BrowserModule } from '../../infra/browser';
import { AutomationTasksModule } from '../automation-tasks/automation-tasks.module';
import { AffiliateLinkCaptureController } from './affiliate-link-capture.controller';
import { AffiliateLinkCaptureService } from './affiliate-link-capture.service';
import { AffiliateLinkCaptureProcessor } from './jobs/affiliate-link-capture.processor';
import { AFFILIATE_LINK_CAPTURE_QUEUE } from './jobs/affiliate-link-capture.job';
import { AmazonAffiliateLinkCaptureProvider } from './providers/amazon-affiliate-link-capture.provider';
import { AffiliateLinkCaptureProviderRegistry } from './providers/affiliate-link-capture-provider.registry';
import { AFFILIATE_LINK_CAPTURE_PROVIDERS } from './providers/affiliate-link-capture-provider.interface';
import { FakeAffiliateLinkCaptureProvider } from './providers/fake-affiliate-link-capture.provider';
import { MercadoLivreAffiliateLinkCaptureProvider } from './providers/mercado-livre-affiliate-link-capture.provider';
import { AffiliateLinkCaptureResultsRepository } from './results/affiliate-link-capture-results.repository';
import { AffiliateLinkCaptureResultsService } from './results/affiliate-link-capture-results.service';
import { PrismaAffiliateLinkCaptureResultsRepository } from './results/prisma-affiliate-link-capture-results.repository';
import { MarketplacesModule } from '../marketplaces/marketplaces.module';

@Module({
  imports: [
    AutomationTasksModule,
    MarketplacesModule,
    BrowserModule,
    BullModule.registerQueue({ name: AFFILIATE_LINK_CAPTURE_QUEUE }),
  ],
  controllers: [AffiliateLinkCaptureController],
  providers: [
    AffiliateLinkCaptureService,
    FakeAffiliateLinkCaptureProvider,
    AmazonAffiliateLinkCaptureProvider,
    MercadoLivreAffiliateLinkCaptureProvider,
    {
      provide: AFFILIATE_LINK_CAPTURE_PROVIDERS,
      useFactory: (
        fakeProvider: FakeAffiliateLinkCaptureProvider,
        amazonProvider: AmazonAffiliateLinkCaptureProvider,
        mercadoLivreProvider: MercadoLivreAffiliateLinkCaptureProvider,
      ) => [fakeProvider, amazonProvider, mercadoLivreProvider],
      inject: [
        FakeAffiliateLinkCaptureProvider,
        AmazonAffiliateLinkCaptureProvider,
        MercadoLivreAffiliateLinkCaptureProvider,
      ],
    },
    AffiliateLinkCaptureProviderRegistry,
    AffiliateLinkCaptureResultsService,
    {
      provide: AffiliateLinkCaptureResultsRepository,
      useClass: PrismaAffiliateLinkCaptureResultsRepository,
    },
    AffiliateLinkCaptureProcessor,
  ],
  exports: [AffiliateLinkCaptureProviderRegistry],
})
export class AffiliateLinkCaptureModule {}
