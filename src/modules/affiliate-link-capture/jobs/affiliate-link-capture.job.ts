import { Marketplace } from '../../../shared/enums/marketplace.enum';

export const AFFILIATE_LINK_CAPTURE_QUEUE = 'affiliate-link-capture';
export const CAPTURE_AFFILIATE_LINK_JOB = 'capture-affiliate-link';

export type AffiliateLinkCaptureJobData = {
  taskId: string;
  productId: string;
  marketplace: Marketplace;
  originalProductUrl: string;
};

export type AffiliateLinkCaptureJobResult = {
  productId: string;
  marketplace: Marketplace;
  originalProductUrl: string;
  capturedAffiliateUrl: string;
};
