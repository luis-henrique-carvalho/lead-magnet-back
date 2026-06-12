import { Injectable } from '@nestjs/common';

import { Marketplace } from '../../../shared/enums/marketplace.enum';
import {
  AffiliateLinkCaptureProvider,
  CaptureAffiliateLinkInput,
  CapturedAffiliateLink,
} from './affiliate-link-capture-provider.interface';

@Injectable()
export class FakeAffiliateLinkCaptureProvider implements AffiliateLinkCaptureProvider {
  readonly marketplaces = [Marketplace.Shopee];

  captureAffiliateLink(
    input: CaptureAffiliateLinkInput,
  ): Promise<CapturedAffiliateLink> {
    const capturedUrl = new URL('https://affiliate-link.fake/capture');
    capturedUrl.searchParams.set('marketplace', input.marketplace);
    capturedUrl.searchParams.set('productId', input.productId);
    capturedUrl.searchParams.set('url', input.originalProductUrl);

    return Promise.resolve({ capturedAffiliateUrl: capturedUrl.toString() });
  }
}
