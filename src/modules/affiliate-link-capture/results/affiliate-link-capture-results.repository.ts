import { Marketplace } from '../../../shared/enums/marketplace.enum';

export type SaveAffiliateLinkCaptureResultInput = {
  taskId: string;
  productId: string;
  marketplace: Marketplace;
  originalProductUrl: string;
  capturedAffiliateUrl: string;
};

export abstract class AffiliateLinkCaptureResultsRepository {
  abstract save(input: SaveAffiliateLinkCaptureResultInput): Promise<void>;
}
