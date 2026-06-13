import { Marketplace } from '../../../shared/enums/marketplace.enum';
import { AffiliateLinkCaptureProviderRegistry } from './affiliate-link-capture-provider.registry';
import { AffiliateLinkCaptureProvider } from './affiliate-link-capture-provider.interface';

describe('AffiliateLinkCaptureProviderRegistry', () => {
  const provider = (
    marketplaces: Marketplace[],
  ): AffiliateLinkCaptureProvider => ({
    marketplaces,
    captureAffiliateLink: jest.fn(),
  });

  it('returns the provider registered for the marketplace', () => {
    const amazonProvider = provider([Marketplace.Amazon]);
    const registry = new AffiliateLinkCaptureProviderRegistry([amazonProvider]);

    expect(registry.getProvider(Marketplace.Amazon)).toBe(amazonProvider);
  });

  it('rejects duplicate marketplace registrations', () => {
    expect(
      () =>
        new AffiliateLinkCaptureProviderRegistry([
          provider([Marketplace.Amazon]),
          provider([Marketplace.Amazon]),
        ]),
    ).toThrow('Affiliate link capture provider already registered: amazon');
  });

  it('fails explicitly when no provider is registered', () => {
    const registry = new AffiliateLinkCaptureProviderRegistry([]);

    expect(() => registry.getProvider(Marketplace.Shopee)).toThrow(
      'Affiliate link capture provider not registered: shopee',
    );
  });
});
