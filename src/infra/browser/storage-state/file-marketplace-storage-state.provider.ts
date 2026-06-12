import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Marketplace } from '../../../shared/enums/marketplace.enum';
import {
  BrowserSessionNotConfiguredError,
  BrowserSessionStateError,
} from './browser-session.errors';
import { MARKETPLACE_STORAGE_STATE_ENV } from './marketplace-storage-state.constants';
import {
  BrowserStorageState,
  MarketplaceStorageStateProvider,
} from './marketplace-storage-state.provider';

@Injectable()
export class FileMarketplaceStorageStateProvider extends MarketplaceStorageStateProvider {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async getStorageState(
    marketplace: Marketplace,
  ): Promise<BrowserStorageState> {
    const environmentVariable = MARKETPLACE_STORAGE_STATE_ENV[marketplace];
    const configuredPath = this.configService.get<string>(environmentVariable);

    if (!configuredPath?.trim()) {
      throw new BrowserSessionNotConfiguredError(
        marketplace,
        environmentVariable,
      );
    }

    const storageStatePath = resolve(configuredPath);

    try {
      const content = await readFile(storageStatePath, 'utf8');
      const storageState: unknown = JSON.parse(content);

      if (!this.isStorageState(storageState)) {
        throw new BrowserSessionStateError(
          marketplace,
          `Invalid Playwright storageState for ${marketplace}: ${storageStatePath}`,
        );
      }

      return storageState;
    } catch (error) {
      if (error instanceof BrowserSessionStateError) {
        throw error;
      }

      throw new BrowserSessionStateError(
        marketplace,
        `Could not load Playwright storageState for ${marketplace}: ${storageStatePath}`,
        { cause: error },
      );
    }
  }

  private isStorageState(value: unknown): value is BrowserStorageState {
    return (
      typeof value === 'object' &&
      value !== null &&
      'cookies' in value &&
      Array.isArray(value.cookies) &&
      'origins' in value &&
      Array.isArray(value.origins)
    );
  }
}
