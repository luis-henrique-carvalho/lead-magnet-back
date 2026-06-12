import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BrowserModule } from '../../infra/browser';
import { AutomationTasksModule } from '../automation-tasks/automation-tasks.module';
import { MarketplacesService } from './marketplaces.service';
import { MarketplacesController } from './marketplaces.controller';
import { AmazonProductProvider } from './providers/amazon-product.provider';
import { MarketplaceProductProviderRegistry } from './providers/marketplace-product-provider.registry';
import { MercadoLivreProductProvider } from './providers/mercado-livre-product.provider';
import { MARKETPLACE_PRODUCT_SEARCH_QUEUE } from './jobs/marketplace-product-search/marketplace-product-search.job';
import { MarketplaceProductSearchProcessor } from './jobs/marketplace-product-search/marketplace-product-search.processor';
import { MarketplaceProductsRepository } from './products/marketplace-products.repository';
import { MarketplaceProductsService } from './products/marketplace-products.service';
import { PrismaMarketplaceProductsRepository } from './products/prisma-marketplace-products.repository';

@Module({
  imports: [
    BrowserModule,
    AutomationTasksModule,
    BullModule.registerQueue({ name: MARKETPLACE_PRODUCT_SEARCH_QUEUE }),
  ],
  providers: [
    MarketplacesService,
    MercadoLivreProductProvider,
    AmazonProductProvider,
    MarketplaceProductProviderRegistry,
    MarketplaceProductsService,
    {
      provide: MarketplaceProductsRepository,
      useClass: PrismaMarketplaceProductsRepository,
    },
    MarketplaceProductSearchProcessor,
  ],
  controllers: [MarketplacesController],
  exports: [MarketplaceProductProviderRegistry],
})
export class MarketplacesModule {}
