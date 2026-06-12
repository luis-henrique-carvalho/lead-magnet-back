import { BrowserContextOptions } from 'playwright';

import { Marketplace } from '../../../shared/enums/marketplace.enum';

export type BrowserStorageState = Exclude<
  BrowserContextOptions['storageState'],
  string | undefined
>;

export abstract class MarketplaceStorageStateProvider {
  abstract getStorageState(
    marketplace: Marketplace,
  ): Promise<BrowserStorageState>;
}
