import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Locator, Page } from 'playwright';

import {
  AuthenticatedBrowserPage,
  BrowserSessionNotConfiguredError,
  PlaywrightService,
} from '../../../infra/browser';
import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';
import { Marketplace } from '../../../shared/enums/marketplace.enum';
import { AffiliateLinkCaptureManualRequiredError } from '../errors/affiliate-link-capture-manual-required.error';
import { MercadoLivreAffiliateLinkCaptureProvider } from './mercado-livre-affiliate-link-capture.provider';

type LocatorFixture = {
  visible?: boolean;
  waitForRejects?: boolean;
  value?: string | null;
  href?: string | null;
  inputValue?: string | null;
  text?: string | null;
};

describe('MercadoLivreAffiliateLinkCaptureProvider', () => {
  let provider: MercadoLivreAffiliateLinkCaptureProvider;
  let openAuthenticatedPage: jest.MockedFunction<
    PlaywrightService['openAuthenticatedPage']
  >;
  let close: jest.MockedFunction<AuthenticatedBrowserPage['close']>;

  const createLocator = (fixture: LocatorFixture = {}): Locator => {
    const locator = {
      first: jest.fn(),
      isVisible: jest.fn().mockResolvedValue(fixture.visible ?? false),
      waitFor: fixture.waitForRejects
        ? jest.fn().mockRejectedValue(new Error('not found'))
        : jest.fn().mockResolvedValue(undefined),
      click: jest.fn().mockResolvedValue(undefined),
      getAttribute: jest.fn((attribute: string) => {
        if (attribute === 'value') {
          return Promise.resolve(fixture.value ?? null);
        }

        if (attribute === 'href') {
          return Promise.resolve(fixture.href ?? null);
        }

        return Promise.resolve(null);
      }),
      inputValue:
        fixture.inputValue === null
          ? jest.fn().mockRejectedValue(new Error('not an input'))
          : jest.fn().mockResolvedValue(fixture.inputValue ?? ''),
      textContent: jest.fn().mockResolvedValue(fixture.text ?? null),
    };
    locator.first.mockReturnValue(locator);

    return locator as unknown as Locator;
  };

  const createPage = (
    fixtures: LocatorFixture[],
    url = 'https://produto.mercadolivre.com.br/MLB-123',
  ): Page => {
    const locators = fixtures.map(createLocator);

    return {
      url: jest.fn().mockReturnValue(url),
      locator: jest.fn().mockImplementation(() => locators.shift()),
    } as unknown as Page;
  };

  const usePage = (page: Page): void => {
    close = jest.fn().mockResolvedValue(undefined);
    openAuthenticatedPage.mockResolvedValue({
      context: {} as AuthenticatedBrowserPage['context'],
      page,
      close,
    });
  };

  beforeEach(async () => {
    openAuthenticatedPage = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoLivreAffiliateLinkCaptureProvider,
        {
          provide: PlaywrightService,
          useValue: { openAuthenticatedPage },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('25') },
        },
      ],
    }).compile();

    provider = module.get(MercadoLivreAffiliateLinkCaptureProvider);
  });

  const input = {
    productId: 'product-id',
    marketplace: Marketplace.MercadoLivre,
    originalProductUrl: 'https://produto.mercadolivre.com.br/MLB-123',
  };

  it('opens an authenticated page and returns the generated affiliate URL', async () => {
    usePage(
      createPage([
        { visible: false },
        { visible: false },
        {},
        { visible: false },
        { visible: false },
        { value: 'https://mercadolivre.com/sec/affiliate-link' },
      ]),
    );

    await expect(provider.captureAffiliateLink(input)).resolves.toEqual({
      capturedAffiliateUrl: 'https://mercadolivre.com/sec/affiliate-link',
    });
    expect(openAuthenticatedPage).toHaveBeenCalledWith(
      Marketplace.MercadoLivre,
      input.originalProductUrl,
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('maps missing browser session configuration to session_invalid', async () => {
    openAuthenticatedPage.mockRejectedValue(
      new BrowserSessionNotConfiguredError(
        Marketplace.MercadoLivre,
        'MERCADO_LIVRE_STORAGE_STATE_PATH',
      ),
    );

    await expect(provider.captureAffiliateLink(input)).rejects.toMatchObject({
      errorType: AutomationErrorType.SessionInvalid,
    });
  });

  it('maps CAPTCHA detection to captcha_required and closes the page', async () => {
    usePage(createPage([{ visible: true }]));

    await expect(provider.captureAffiliateLink(input)).rejects.toMatchObject({
      errorType: AutomationErrorType.CaptchaRequired,
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('maps login redirects to session_invalid', async () => {
    usePage(
      createPage(
        [{ visible: false }],
        'https://auth.mercadolivre.com.br/login',
      ),
    );

    await expect(provider.captureAffiliateLink(input)).rejects.toMatchObject({
      errorType: AutomationErrorType.SessionInvalid,
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('maps a missing affiliate action to layout_changed', async () => {
    usePage(
      createPage([
        { visible: false },
        { visible: false },
        { waitForRejects: true },
      ]),
    );

    await expect(provider.captureAffiliateLink(input)).rejects.toEqual(
      expect.objectContaining<Partial<AffiliateLinkCaptureManualRequiredError>>(
        {
          errorType: AutomationErrorType.LayoutChanged,
        },
      ),
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('maps a missing generated URL to layout_changed', async () => {
    usePage(
      createPage([
        { visible: false },
        { visible: false },
        {},
        { visible: false },
        { visible: false },
        { waitForRejects: true },
      ]),
    );

    await expect(provider.captureAffiliateLink(input)).rejects.toMatchObject({
      errorType: AutomationErrorType.LayoutChanged,
    });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
