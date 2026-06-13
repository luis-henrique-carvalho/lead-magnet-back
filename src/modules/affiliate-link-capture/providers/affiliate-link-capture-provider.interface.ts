import { Marketplace } from '../../../shared/enums/marketplace.enum';

export const AFFILIATE_LINK_CAPTURE_PROVIDERS = Symbol(
  'AFFILIATE_LINK_CAPTURE_PROVIDERS',
);

export type CaptureAffiliateLinkInput = {
  productId: string;
  marketplace: Marketplace;
  originalProductUrl: string;
};

export type CapturedAffiliateLink = {
  capturedAffiliateUrl: string;
};

export interface AffiliateLinkCaptureProvider {
  readonly marketplaces: readonly Marketplace[];

  captureAffiliateLink(
    input: CaptureAffiliateLinkInput,
  ): Promise<CapturedAffiliateLink>;
}
