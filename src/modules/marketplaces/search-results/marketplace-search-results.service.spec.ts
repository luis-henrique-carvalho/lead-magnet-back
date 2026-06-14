import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  MarketplaceSearchResultOriginState,
  MarketplaceSearchResultsRepository,
} from './marketplace-search-results.repository';
import { MarketplaceSearchResultsService } from './marketplace-search-results.service';

describe('MarketplaceSearchResultsService', () => {
  let service: MarketplaceSearchResultsService;
  const repository = { findOriginTask: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MarketplaceSearchResultsService,
        { provide: MarketplaceSearchResultsRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(MarketplaceSearchResultsService);
  });

  it('returns the relational origin', async () => {
    const origin = { resultId: 'result-id' };
    repository.findOriginTask.mockResolvedValue({
      state: MarketplaceSearchResultOriginState.Found,
      origin,
    });

    await expect(service.findOriginTask('result-id')).resolves.toBe(origin);
  });

  it('throws conflict for a legacy result', async () => {
    repository.findOriginTask.mockResolvedValue({
      state: MarketplaceSearchResultOriginState.Legacy,
    });

    await expect(service.findOriginTask('legacy')).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws not found for an unknown result', async () => {
    repository.findOriginTask.mockResolvedValue(null);

    await expect(service.findOriginTask('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
