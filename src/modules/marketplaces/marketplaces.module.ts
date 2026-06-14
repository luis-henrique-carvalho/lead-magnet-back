import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BrowserModule } from '../../infra/browser';
import { AutomationTasksModule } from '../automation-tasks/automation-tasks.module';
import { MarketplacesService } from './marketplaces.service';
import { MarketplacesController } from './marketplaces.controller';
import { AmazonProductProvider } from './providers/amazon/amazon-product.provider';
import { MarketplaceProductProviderRegistry } from './providers/marketplace-product-provider.registry';
import { MercadoLivreProductProvider } from './providers/mercado-livre/mercado-livre-product.provider';
import { MARKETPLACE_PRODUCT_SEARCH_QUEUE } from './jobs/marketplace-product-search/marketplace-product-search.job';
import { MarketplaceProductSearchProcessor } from './jobs/marketplace-product-search/marketplace-product-search.processor';
import { MarketplaceProductsRepository } from './products/marketplace-products.repository';
import { MarketplaceProductsService } from './products/marketplace-products.service';
import { PrismaMarketplaceProductsRepository } from './products/prisma-marketplace-products.repository';
import { MarketplaceProductSearchesRepository } from './searches/marketplace-product-searches.repository';
import { MarketplaceProductSearchesService } from './searches/marketplace-product-searches.service';
import { PrismaMarketplaceProductSearchesRepository } from './searches/prisma-marketplace-product-searches.repository';
import { MarketplaceProductSearchesController } from './searches/marketplace-product-searches.controller';
import { MarketplaceProductsController } from './products/marketplace-products.controller';
import { MarketplaceSearchResultsController } from './search-results/marketplace-search-results.controller';
import { MarketplaceSearchResultsRepository } from './search-results/marketplace-search-results.repository';
import { MarketplaceSearchResultsService } from './search-results/marketplace-search-results.service';
import { PrismaMarketplaceSearchResultsRepository } from './search-results/prisma-marketplace-search-results.repository';

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
    MarketplaceProductSearchesService,
    MarketplaceSearchResultsService,
    {
      provide: MarketplaceProductsRepository,
      useClass: PrismaMarketplaceProductsRepository,
    },
    {
      provide: MarketplaceProductSearchesRepository,
      useClass: PrismaMarketplaceProductSearchesRepository,
    },
    {
      provide: MarketplaceSearchResultsRepository,
      useClass: PrismaMarketplaceSearchResultsRepository,
    },
    MarketplaceProductSearchProcessor,
  ],
  controllers: [
    MarketplacesController,
    MarketplaceProductSearchesController,
    MarketplaceProductsController,
    MarketplaceSearchResultsController,
  ],
  exports: [
    MarketplaceProductProviderRegistry,
    MarketplaceProductSearchesService,
  ],
})
export class MarketplacesModule {}
