import { ConfigService } from '@nestjs/config';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Marketplace } from '../../../shared/enums/marketplace.enum';
import {
  BrowserSessionNotConfiguredError,
  BrowserSessionStateError,
} from './browser-session.errors';
import { FileMarketplaceStorageStateProvider } from './file-marketplace-storage-state.provider';

describe('FileMarketplaceStorageStateProvider', () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'storage-state-'));
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { force: true, recursive: true });
  });

  it('loads a configured storageState file', async () => {
    const path = join(temporaryDirectory, 'amazon.storage-state.json');
    const storageState = { cookies: [], origins: [] };
    await writeFile(path, JSON.stringify(storageState));
    const getConfig = jest.fn().mockReturnValue(path);
    const configService = {
      get: getConfig,
    } as unknown as ConfigService;
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(provider.getStorageState(Marketplace.Amazon)).resolves.toEqual(
      storageState,
    );
    expect(getConfig).toHaveBeenCalledWith('AMAZON_STORAGE_STATE_PATH');
  });

  it('uses the local Mercado Livre fallback when the env var is missing', async () => {
    const fallbackPath = join(
      temporaryDirectory,
      '.auth',
      'mercadolivre-storage-state.json',
    );
    const storageState = { cookies: [], origins: [] };
    await mkdir(join(temporaryDirectory, '.auth'), { recursive: true });
    await writeFile(fallbackPath, JSON.stringify(storageState));
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const provider = new FileMarketplaceStorageStateProvider(configService);

    const originalCwd = process.cwd();

    try {
      process.chdir(temporaryDirectory);

      await expect(
        provider.getStorageState(Marketplace.MercadoLivre),
      ).resolves.toEqual(storageState);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(configService.get).toHaveBeenCalledWith(
        'MERCADO_LIVRE_STORAGE_STATE_PATH',
      );
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('fails explicitly when the marketplace session is not configured', async () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(provider.getStorageState(Marketplace.Shopee)).rejects.toEqual(
      new BrowserSessionNotConfiguredError(
        Marketplace.Shopee,
        'SHOPEE_STORAGE_STATE_PATH',
      ),
    );
  });

  it('rejects malformed storageState content', async () => {
    const path = join(temporaryDirectory, 'invalid.storage-state.json');
    await writeFile(path, JSON.stringify({ cookies: [] }));
    const configService = {
      get: jest.fn().mockReturnValue(path),
    } as unknown as ConfigService;
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(
      provider.getStorageState(Marketplace.Shopee),
    ).rejects.toBeInstanceOf(BrowserSessionStateError);
  });
});
