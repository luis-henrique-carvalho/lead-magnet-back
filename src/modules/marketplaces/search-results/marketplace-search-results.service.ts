import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  MarketplaceSearchResultOriginState,
  MarketplaceSearchResultsRepository,
} from './marketplace-search-results.repository';

@Injectable()
export class MarketplaceSearchResultsService {
  constructor(
    private readonly repository: MarketplaceSearchResultsRepository,
  ) {}

  async findOriginTask(resultId: string) {
    const result = await this.repository.findOriginTask(resultId);

    if (!result) {
      throw new NotFoundException('Marketplace search result not found');
    }

    if (result.state === MarketplaceSearchResultOriginState.Legacy) {
      throw new ConflictException(
        'Legacy result has no relational origin task',
      );
    }

    return result.origin;
  }
}
