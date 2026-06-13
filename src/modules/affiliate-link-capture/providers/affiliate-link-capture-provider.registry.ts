import { Inject, Injectable } from '@nestjs/common';

import { Marketplace } from '../../../shared/enums/marketplace.enum';
import {
  AFFILIATE_LINK_CAPTURE_PROVIDERS,
  AffiliateLinkCaptureProvider,
} from './affiliate-link-capture-provider.interface';

@Injectable()
export class AffiliateLinkCaptureProviderRegistry {
  private readonly providers: Map<Marketplace, AffiliateLinkCaptureProvider>;

  constructor(
    @Inject(AFFILIATE_LINK_CAPTURE_PROVIDERS)
    providers: AffiliateLinkCaptureProvider[],
  ) {
    this.providers = new Map();

    for (const provider of providers) {
      for (const marketplace of provider.marketplaces) {
        if (this.providers.has(marketplace)) {
          throw new Error(
            `Affiliate link capture provider already registered: ${marketplace}`,
          );
        }

        this.providers.set(marketplace, provider);
      }
    }
  }

  getProvider(marketplace: Marketplace): AffiliateLinkCaptureProvider {
    const provider = this.providers.get(marketplace);

    if (!provider) {
      throw new Error(
        `Affiliate link capture provider not registered: ${marketplace}`,
      );
    }

    return provider;
  }
}
