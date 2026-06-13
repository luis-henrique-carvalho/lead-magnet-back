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
import { AmazonAffiliateLinkCaptureProvider } from './amazon-affiliate-link-capture.provider';

type LocatorFixture = {
  visible?: boolean;
  waitForRejects?: boolean;
  value?: string | null;
  href?: string | null;
  inputValue?: string | null;
  text?: string | null;
};

describe('AmazonAffiliateLinkCaptureProvider', () => {
  let provider: AmazonAffiliateLinkCaptureProvider;
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
    url = 'https://www.amazon.com.br/dp/B000000001',
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
        AmazonAffiliateLinkCaptureProvider,
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

    provider = module.get(AmazonAffiliateLinkCaptureProvider);
  });

  const input = {
    productId: 'product-id',
    marketplace: Marketplace.Amazon,
    originalProductUrl: 'https://www.amazon.com.br/dp/B000000001',
  };

  it('opens an authenticated page and returns the SiteStripe URL', async () => {
    usePage(
      createPage([
        { visible: false },
        { visible: false },
        {},
        { visible: false },
        { visible: false },
        { visible: true },
        { value: 'https://amzn.to/affiliate-link' },
      ]),
    );

    await expect(provider.captureAffiliateLink(input)).resolves.toEqual({
      capturedAffiliateUrl: 'https://amzn.to/affiliate-link',
    });
    expect(openAuthenticatedPage).toHaveBeenCalledWith(
      Marketplace.Amazon,
      input.originalProductUrl,
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('maps missing browser session configuration to session_invalid', async () => {
    openAuthenticatedPage.mockRejectedValue(
      new BrowserSessionNotConfiguredError(
        Marketplace.Amazon,
        'AMAZON_STORAGE_STATE_PATH',
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

  it('maps sign-in redirects to session_invalid', async () => {
    usePage(
      createPage([{ visible: false }], 'https://www.amazon.com.br/ap/signin'),
    );

    await expect(provider.captureAffiliateLink(input)).rejects.toMatchObject({
      errorType: AutomationErrorType.SessionInvalid,
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('maps a missing SiteStripe action to layout_changed', async () => {
    usePage(
      createPage([
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

  it('maps a missing generated URL to layout_changed', async () => {
    usePage(
      createPage([
        { visible: false },
        { visible: false },
        {},
        { visible: false },
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
