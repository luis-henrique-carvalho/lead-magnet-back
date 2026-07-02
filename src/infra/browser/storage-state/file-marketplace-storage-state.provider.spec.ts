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

  const createConfigService = (values: Record<string, string | undefined>) =>
    ({
      get: jest.fn((key: string) => values[key]),
    }) as unknown as ConfigService;

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
    const configService = createConfigService({
      AMAZON_STORAGE_STATE_PATH: path,
    });
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(provider.getStorageState(Marketplace.Amazon)).resolves.toEqual(
      storageState,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(configService.get).toHaveBeenCalledWith('AMAZON_STORAGE_STATE_PATH');
  });

  it('converts a Mercado Livre cookie header file into storageState', async () => {
    const path = join(temporaryDirectory, 'mercadolivre.cookie');
    await writeFile(path, 'Cookie: _csrf=csrf-token; ssid=session-token');
    const configService = createConfigService({
      MERCADO_LIVRE_COOKIE_HEADER_PATH: path,
    });
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(
      provider.getStorageState(Marketplace.MercadoLivre),
    ).resolves.toEqual({
      cookies: [
        {
          name: '_csrf',
          value: 'csrf-token',
          domain: '.mercadolivre.com.br',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        },
        {
          name: 'ssid',
          value: 'session-token',
          domain: '.mercadolivre.com.br',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    });
  });

  it('converts an inline Mercado Livre cookie header into storageState', async () => {
    const configService = createConfigService({
      MERCADO_LIVRE_COOKIE_HEADER: 'ssid=session-token; encoded=a=b',
    });
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(
      provider.getStorageState(Marketplace.MercadoLivre),
    ).resolves.toEqual({
      cookies: [
        {
          name: 'ssid',
          value: 'session-token',
          domain: '.mercadolivre.com.br',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        },
        {
          name: 'encoded',
          value: 'a=b',
          domain: '.mercadolivre.com.br',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    });
  });

  it('prefers a Mercado Livre cookie header file over inline and storageState sources', async () => {
    const cookieHeaderPath = join(temporaryDirectory, 'mercadolivre.cookie');
    const storageStatePath = join(
      temporaryDirectory,
      'mercadolivre.storage-state.json',
    );
    await writeFile(cookieHeaderPath, 'ssid=file-session');
    await writeFile(
      storageStatePath,
      JSON.stringify({ cookies: [], origins: [] }),
    );
    const configService = createConfigService({
      MERCADO_LIVRE_COOKIE_HEADER_PATH: cookieHeaderPath,
      MERCADO_LIVRE_COOKIE_HEADER: 'ssid=inline-session',
      MERCADO_LIVRE_STORAGE_STATE_PATH: storageStatePath,
    });
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(
      provider.getStorageState(Marketplace.MercadoLivre),
    ).resolves.toMatchObject({
      cookies: [{ name: 'ssid', value: 'file-session' }],
      origins: [],
    });
  });

  it('prefers an inline Mercado Livre cookie header over storageState sources', async () => {
    const storageStatePath = join(
      temporaryDirectory,
      'mercadolivre.storage-state.json',
    );
    await writeFile(
      storageStatePath,
      JSON.stringify({ cookies: [], origins: [] }),
    );
    const configService = createConfigService({
      MERCADO_LIVRE_COOKIE_HEADER: 'ssid=inline-session',
      MERCADO_LIVRE_STORAGE_STATE_PATH: storageStatePath,
    });
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(
      provider.getStorageState(Marketplace.MercadoLivre),
    ).resolves.toMatchObject({
      cookies: [{ name: 'ssid', value: 'inline-session' }],
      origins: [],
    });
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
    const configService = createConfigService({});
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
    const configService = createConfigService({});
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
    const configService = createConfigService({
      SHOPEE_STORAGE_STATE_PATH: path,
    });
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(
      provider.getStorageState(Marketplace.Shopee),
    ).rejects.toBeInstanceOf(BrowserSessionStateError);
  });

  it('rejects an empty Mercado Livre cookie header file without leaking values', async () => {
    const path = join(temporaryDirectory, 'empty.cookie');
    await writeFile(path, '');
    const configService = createConfigService({
      MERCADO_LIVRE_COOKIE_HEADER_PATH: path,
    });
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(
      provider.getStorageState(Marketplace.MercadoLivre),
    ).rejects.toThrow('Invalid Mercado Livre cookie header file');
  });

  it('rejects malformed Mercado Livre cookie headers without leaking values', async () => {
    const secretCookieHeader = 'ssid-secret-value';
    const configService = createConfigService({
      MERCADO_LIVRE_COOKIE_HEADER: secretCookieHeader,
    });
    const provider = new FileMarketplaceStorageStateProvider(configService);

    try {
      await provider.getStorageState(Marketplace.MercadoLivre);
      fail('Expected Mercado Livre cookie header to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(BrowserSessionStateError);
      expect((error as Error).message).not.toContain(secretCookieHeader);
      expect((error as Error).message).toContain(
        'Invalid Mercado Livre cookie header',
      );
    }
  });

  it('rejects Mercado Livre cookie headers without a session cookie without leaking values', async () => {
    const secretCookieHeader = '_csrf=secret-csrf-value';
    const configService = createConfigService({
      MERCADO_LIVRE_COOKIE_HEADER: secretCookieHeader,
    });
    const provider = new FileMarketplaceStorageStateProvider(configService);

    try {
      await provider.getStorageState(Marketplace.MercadoLivre);
      fail('Expected Mercado Livre cookie header to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(BrowserSessionStateError);
      expect((error as Error).message).not.toContain('secret-csrf-value');
      expect((error as Error).message).toContain(
        'Invalid Mercado Livre cookie header',
      );
    }
  });

  it('fails when a configured Mercado Livre cookie header file cannot be loaded', async () => {
    const path = join(temporaryDirectory, 'missing.cookie');
    const configService = createConfigService({
      MERCADO_LIVRE_COOKIE_HEADER_PATH: path,
    });
    const provider = new FileMarketplaceStorageStateProvider(configService);

    await expect(
      provider.getStorageState(Marketplace.MercadoLivre),
    ).rejects.toThrow('Could not load Mercado Livre cookie header file');
  });
});
