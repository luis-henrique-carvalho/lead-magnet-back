import { Injectable } from '@nestjs/common';

import {
  AffiliateLinkCaptureResultsRepository,
  SaveAffiliateLinkCaptureResultInput,
} from './affiliate-link-capture-results.repository';

@Injectable()
export class AffiliateLinkCaptureResultsService {
  constructor(
    private readonly repository: AffiliateLinkCaptureResultsRepository,
  ) {}

  save(input: SaveAffiliateLinkCaptureResultInput): Promise<void> {
    return this.repository.save(input);
  }
}
