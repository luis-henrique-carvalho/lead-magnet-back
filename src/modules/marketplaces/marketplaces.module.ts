import { Module } from '@nestjs/common';
import { MarketplacesService } from './marketplaces.service';
import { MarketplacesController } from './marketplaces.controller';
import { AmazonProductProvider } from './providers/amazon-product.provider';
import { MarketplaceProductProviderRegistry } from './providers/marketplace-product-provider.registry';
import { MercadoLivreProductProvider } from './providers/mercado-livre-product.provider';

@Module({
  providers: [
    MarketplacesService,
    MercadoLivreProductProvider,
    AmazonProductProvider,
    MarketplaceProductProviderRegistry,
  ],
  controllers: [MarketplacesController],
  exports: [MarketplaceProductProviderRegistry],
})
export class MarketplacesModule {}
