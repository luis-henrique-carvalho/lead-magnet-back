import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

import { AffiliateLinkCaptureService } from './affiliate-link-capture.service';
import { CaptureAffiliateLinkDto } from './dto/capture-affiliate-link.dto';
import { CaptureAffiliateLinkResponseDto } from './dto/capture-affiliate-link-response.dto';

@ApiTags('affiliate-link-capture')
@Controller('affiliate-link-capture')
export class AffiliateLinkCaptureController {
  constructor(private readonly service: AffiliateLinkCaptureService) {}

  @Post()
  @ApiCreatedResponse({ type: CaptureAffiliateLinkResponseDto })
  capture(
    @Body() input: CaptureAffiliateLinkDto,
  ): Promise<CaptureAffiliateLinkResponseDto> {
    return this.service.capture(input);
  }
}
