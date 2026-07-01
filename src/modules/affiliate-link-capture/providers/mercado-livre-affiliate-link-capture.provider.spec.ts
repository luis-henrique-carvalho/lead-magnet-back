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
  visible?: boolean | (() => boolean);
  waitForRejects?: boolean;
  value?: string | null;
  href?: string | null;
  inputValue?: string | null;
  text?: string | null;
  onClick?: () => void;
  onFill?: (value: string) => void;
  onWaitFor?: (options: unknown) => void;
};

describe('MercadoLivreAffiliateLinkCaptureProvider', () => {
  let provider: MercadoLivreAffiliateLinkCaptureProvider;
  let openAuthenticatedPage: jest.MockedFunction<
    PlaywrightService['openAuthenticatedPage']
  >;
  let close: jest.MockedFunction<AuthenticatedBrowserPage['close']>;

  const createLocator = (fixture: LocatorFixture = {}): Locator => {
    const isVisible = (): boolean =>
      typeof fixture.visible === 'function'
        ? fixture.visible()
        : (fixture.visible ?? false);
    const locator = {
      first: jest.fn(),
      filter: jest.fn(),
      isVisible: jest
        .fn()
        .mockImplementation(() => Promise.resolve(isVisible())),
      waitFor: fixture.waitForRejects
        ? jest.fn().mockRejectedValue(new Error('not found'))
        : jest.fn().mockImplementation((options: unknown) => {
            fixture.onWaitFor?.(options);
            return Promise.resolve();
          }),
      click: jest.fn().mockImplementation(() => {
        fixture.onClick?.();
        return Promise.resolve();
      }),
      fill: jest.fn().mockImplementation((value: string) => {
        fixture.onFill?.(value);
        return Promise.resolve();
      }),
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
    locator.filter.mockReturnValue(locator);

    return locator as unknown as Locator;
  };

  const createPage = (
    fixtures: LocatorFixture[],
    url = 'https://produto.mercadolivre.com.br/MLB-123',
    context?: Partial<Page['context']> | null,
    selectorFixtures: Record<string, LocatorFixture> = {},
  ): Page => {
    const locators = fixtures.map(createLocator);

    return {
      url: jest.fn().mockReturnValue(url),
      locator: jest.fn().mockImplementation((selector: string) => {
        if (selector === 'div') {
          return createLocator(selectorFixtures.Entendi ?? { visible: false });
        }

        if (selector.includes('Entendi')) {
          return createLocator(
            selectorFixtures.Entendi ?? {
              visible: false,
            },
          );
        }

        const selectorFixture = Object.entries(selectorFixtures).find(([key]) =>
          selector.includes(key),
        )?.[1];

        return selectorFixture
          ? createLocator(selectorFixture)
          : locators.shift();
      }),
      context: jest.fn().mockReturnValue(context ?? {}),
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

  it('dismisses the Mercado Livre cashback div modal before reading the generated URL', async () => {
    const clickedButtons: string[] = [];
    let modalVisible = true;
    usePage(
      createPage(
        [
          { visible: false },
          { visible: false },
          {},
          { visible: false },
          { visible: false },
          { value: 'https://mercadolivre.com/sec/affiliate-link' },
        ],
        input.originalProductUrl,
        null,
        {
          Entendi: {
            visible: () => modalVisible,
            onClick: () => {
              modalVisible = false;
              clickedButtons.push('Entendi');
            },
          },
        },
      ),
    );

    await expect(provider.captureAffiliateLink(input)).resolves.toEqual({
      capturedAffiliateUrl: 'https://mercadolivre.com/sec/affiliate-link',
    });
    expect(clickedButtons).toContain('Entendi');
  });

  it('clicks the affiliate action again after dismissing a cashback modal opened by the first click', async () => {
    const affiliateActionClicks: string[] = [];
    const clickedButtons: string[] = [];
    let modalVisible = false;
    usePage(
      createPage(
        [
          { visible: false },
          { visible: false },
          {
            onClick: () => {
              modalVisible = true;
              affiliateActionClicks.push('first');
            },
          },
          {
            onClick: () => {
              affiliateActionClicks.push('second');
            },
          },
          { visible: false },
          { visible: false },
          { value: 'https://mercadolivre.com/sec/affiliate-link' },
        ],
        input.originalProductUrl,
        null,
        {
          Entendi: {
            visible: () => modalVisible,
            onClick: () => {
              modalVisible = false;
              clickedButtons.push('Entendi');
            },
          },
        },
      ),
    );

    await expect(provider.captureAffiliateLink(input)).resolves.toEqual({
      capturedAffiliateUrl: 'https://mercadolivre.com/sec/affiliate-link',
    });
    expect(clickedButtons).toEqual(['Entendi']);
    expect(affiliateActionClicks).toEqual(['first', 'second']);
  });

  it('reads the generated URL from the Mercado Livre link generator textarea', async () => {
    usePage(
      createPage(
        [
          { visible: false },
          { visible: false },
          {},
          { visible: false },
          { visible: false },
        ],
        input.originalProductUrl,
        null,
        {
          'text-field__label_link': {
            inputValue: 'https://mercadolivre.com/sec/text-field-link',
          },
        },
      ),
    );

    await expect(provider.captureAffiliateLink(input)).resolves.toEqual({
      capturedAffiliateUrl: 'https://mercadolivre.com/sec/text-field-link',
    });
  });

  it('returns the generated affiliate URL when Mercado Livre opens a new page', async () => {
    const popup = createPage([
      { visible: false },
      { visible: false },
      { value: 'https://mercadolivre.com/sec/popup-affiliate-link' },
    ]);
    const context = {
      waitForEvent: jest.fn().mockResolvedValue(popup),
    };
    usePage(
      createPage(
        [
          { visible: false },
          { visible: false },
          {},
          { visible: false },
          { visible: false },
          { waitForRejects: true },
        ],
        input.originalProductUrl,
        context,
      ),
    );

    await expect(provider.captureAffiliateLink(input)).resolves.toEqual({
      capturedAffiliateUrl: 'https://mercadolivre.com/sec/popup-affiliate-link',
    });
  });

  it('generates the affiliate URL with Mercado Livre product ID when the direct output is not available', async () => {
    const filledValues: string[] = [];
    usePage(
      createPage([
        { visible: false },
        { visible: false },
        {},
        { visible: false },
        { visible: false },
        { waitForRejects: true },
        {},
        { onFill: (value) => filledValues.push(value) },
        { value: 'https://mercadolivre.com/sec/id-affiliate-link' },
      ]),
    );

    await expect(provider.captureAffiliateLink(input)).resolves.toEqual({
      capturedAffiliateUrl: 'https://mercadolivre.com/sec/id-affiliate-link',
    });
    expect(filledValues).toContain('MLB-123');
  });

  it('maps missing generated URL to layout_changed when product ID fallback cannot be derived', async () => {
    usePage(
      createPage(
        [
          { visible: false },
          { visible: false },
          {},
          { visible: false },
          { visible: false },
          { waitForRejects: true },
        ],
        'https://www.mercadolivre.com.br/oferta-sem-id',
      ),
    );

    await expect(
      provider.captureAffiliateLink({
        ...input,
        originalProductUrl: 'https://www.mercadolivre.com.br/oferta-sem-id',
      }),
    ).rejects.toMatchObject({
      errorType: AutomationErrorType.LayoutChanged,
    });
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

  it('maps Mercado Livre robot challenge text to captcha_required', async () => {
    usePage(
      createPage([{ visible: false }], input.originalProductUrl, null, {
        'body:has-text("captcha")': { visible: true },
      }),
    );

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

  it('maps Mercado Livre login prompt text to session_invalid', async () => {
    usePage(
      createPage([{ visible: false }], input.originalProductUrl, null, {
        'body:has-text("Digite seu e-mail ou telefone")': { visible: true },
      }),
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

  it('maps an invalid generated URL to layout_changed', async () => {
    usePage(
      createPage([
        { visible: false },
        { visible: false },
        {},
        { visible: false },
        { visible: false },
        { value: 'not-a-url' },
      ]),
    );

    await expect(provider.captureAffiliateLink(input)).rejects.toMatchObject({
      errorType: AutomationErrorType.LayoutChanged,
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('uses configured capture timeout when waiting for Mercado Livre UI', async () => {
    const waitOptions: unknown[] = [];
    usePage(
      createPage([
        { visible: false },
        { visible: false },
        { onWaitFor: (options) => waitOptions.push(options) },
        { visible: false },
        { visible: false },
        {
          value: 'https://mercadolivre.com/sec/affiliate-link',
          onWaitFor: (options) => waitOptions.push(options),
        },
      ]),
    );

    await provider.captureAffiliateLink(input);

    expect(waitOptions).toEqual(
      expect.arrayContaining([expect.objectContaining({ timeout: 25 })]),
    );
  });
});
