import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Browser, BrowserContext, Page } from 'playwright';

import { Marketplace } from '../../../shared/enums/marketplace.enum';
import { MarketplaceStorageStateProvider } from '../storage-state/marketplace-storage-state.provider';
import { PLAYWRIGHT_BROWSER_TYPE } from './playwright.constants';
import { PlaywrightService } from './playwright.service';
import { PlaywrightBrowserType } from './playwright.types';

describe('PlaywrightService', () => {
  let service: PlaywrightService;
  let launch: jest.MockedFunction<PlaywrightBrowserType['launch']>;
  let newContext: jest.MockedFunction<Browser['newContext']>;
  let closeBrowser: jest.MockedFunction<Browser['close']>;
  let getStorageState: jest.MockedFunction<
    MarketplaceStorageStateProvider['getStorageState']
  >;
  let firstContext: BrowserContext;
  let firstPage: Page;
  let closeFirstContext: jest.Mock;
  let firstPageGoto: jest.Mock;
  let setFirstPageNavigationTimeout: jest.Mock;

  const createPage = () =>
    ({
      goto: jest.fn().mockResolvedValue(null),
      setDefaultNavigationTimeout: jest.fn(),
    }) as unknown as Page;

  const createContext = (page: Page) =>
    ({
      close: jest.fn().mockResolvedValue(undefined),
      newPage: jest.fn().mockResolvedValue(page),
    }) as unknown as BrowserContext;

  beforeEach(async () => {
    firstPageGoto = jest.fn().mockResolvedValue(null);
    setFirstPageNavigationTimeout = jest.fn();
    firstPage = {
      goto: firstPageGoto,
      setDefaultNavigationTimeout: setFirstPageNavigationTimeout,
    } as unknown as Page;
    closeFirstContext = jest.fn().mockResolvedValue(undefined);
    firstContext = {
      close: closeFirstContext,
      newPage: jest.fn().mockResolvedValue(firstPage),
    } as unknown as BrowserContext;
    newContext = jest.fn().mockResolvedValue(firstContext);
    closeBrowser = jest.fn().mockResolvedValue(undefined);
    const browser = {
      close: closeBrowser,
      newContext,
    } as unknown as Browser;
    launch = jest.fn().mockResolvedValue(browser);
    getStorageState = jest.fn().mockResolvedValue({ cookies: [], origins: [] });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaywrightService,
        {
          provide: PLAYWRIGHT_BROWSER_TYPE,
          useValue: { launch },
        },
        {
          provide: MarketplaceStorageStateProvider,
          useValue: { getStorageState },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'PLAYWRIGHT_NAVIGATION_TIMEOUT_MS') {
                return '15000';
              }

              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PlaywrightService);
  });

  it('opens an authenticated page in an isolated context', async () => {
    const session = await service.openAuthenticatedPage(
      Marketplace.Amazon,
      'https://amazon.com.br/dp/B000000001',
    );

    expect(getStorageState).toHaveBeenCalledWith(Marketplace.Amazon);
    expect(launch).toHaveBeenCalledWith({ headless: true });
    expect(newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        storageState: { cookies: [], origins: [] },
      }),
    );
    expect(setFirstPageNavigationTimeout).toHaveBeenCalledWith(15000);
    expect(firstPageGoto).toHaveBeenCalledWith(
      'https://amazon.com.br/dp/B000000001',
      { waitUntil: 'domcontentloaded' },
    );
    expect(session.context).toBe(firstContext);
    expect(session.page).toBe(firstPage);
  });

  it('reuses the browser and creates a context per page', async () => {
    const secondPage = createPage();
    const secondContext = createContext(secondPage);
    newContext
      .mockResolvedValueOnce(firstContext)
      .mockResolvedValueOnce(secondContext);

    await service.openAuthenticatedPage(
      Marketplace.Amazon,
      'https://amazon.com.br/first',
    );
    await service.openAuthenticatedPage(
      Marketplace.MercadoLivre,
      'https://mercadolivre.com.br/second',
    );

    expect(launch).toHaveBeenCalledTimes(1);
    expect(newContext).toHaveBeenCalledTimes(2);
  });

  it('closes a session context only once', async () => {
    const session = await service.openAuthenticatedPage(
      Marketplace.Amazon,
      'https://amazon.com.br/dp/B000000001',
    );

    await session.close();
    await session.close();

    expect(closeFirstContext).toHaveBeenCalledTimes(1);
  });

  it('closes open contexts and the reused browser on module destroy', async () => {
    await service.openAuthenticatedPage(
      Marketplace.Amazon,
      'https://amazon.com.br/dp/B000000001',
    );

    await service.onModuleDestroy();

    expect(closeFirstContext).toHaveBeenCalledTimes(1);
    expect(closeBrowser).toHaveBeenCalledTimes(1);
  });

  it('closes the context when page creation or navigation fails', async () => {
    const error = new Error('Navigation failed');
    firstPageGoto.mockRejectedValue(error);

    await expect(
      service.openAuthenticatedPage(
        Marketplace.Amazon,
        'https://amazon.com.br/dp/B000000001',
      ),
    ).rejects.toBe(error);
    expect(closeFirstContext).toHaveBeenCalledTimes(1);
  });

  it('rejects non-HTTP navigation before loading credentials', async () => {
    await expect(
      service.openAuthenticatedPage(Marketplace.Amazon, 'file:///etc/passwd'),
    ).rejects.toThrow('Browser navigation only supports HTTP(S) URLs');
    expect(getStorageState).not.toHaveBeenCalled();
  });
});
