import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { MarketplaceSearchResultOriginTaskResponseDto } from './dto/marketplace-search-result-origin-task-response.dto';
import { MarketplaceSearchResultsService } from './marketplace-search-results.service';

@ApiTags('marketplace-search-results')
@Controller('marketplace-search-results')
export class MarketplaceSearchResultsController {
  constructor(
    private readonly resultsService: MarketplaceSearchResultsService,
  ) {}

  @Get(':resultId/task')
  @ApiOperation({
    summary: 'Get the origin task of a marketplace search result',
  })
  @ApiOkResponse({ type: MarketplaceSearchResultOriginTaskResponseDto })
  @ApiNotFoundResponse({ description: 'Marketplace search result not found' })
  @ApiConflictResponse({
    description: 'Legacy result without a relational search origin',
  })
  findOriginTask(@Param('resultId') resultId: string) {
    return this.resultsService.findOriginTask(resultId);
  }
}
