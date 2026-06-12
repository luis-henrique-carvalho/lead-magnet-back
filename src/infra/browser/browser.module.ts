import { Module } from '@nestjs/common';
import { chromium } from 'playwright';

import { PLAYWRIGHT_BROWSER_TYPE } from './playwright/playwright.constants';
import { PlaywrightService } from './playwright/playwright.service';
import { FileMarketplaceStorageStateProvider } from './storage-state/file-marketplace-storage-state.provider';
import { MarketplaceStorageStateProvider } from './storage-state/marketplace-storage-state.provider';

@Module({
  providers: [
    {
      provide: PLAYWRIGHT_BROWSER_TYPE,
      useValue: chromium,
    },
    {
      provide: MarketplaceStorageStateProvider,
      useClass: FileMarketplaceStorageStateProvider,
    },
    PlaywrightService,
  ],
  exports: [PlaywrightService],
})
export class BrowserModule {}
