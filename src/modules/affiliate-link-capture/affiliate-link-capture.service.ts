import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import { AutomationTaskType } from '../../shared/enums/automation-task-type.enum';
import { AutomationTasksService } from '../automation-tasks/automation-tasks.service';
import { AutomationTaskDependenciesService } from '../automation-tasks/dependencies/automation-task-dependencies.service';
import { MarketplaceProductSearchesService } from '../marketplaces/searches/marketplace-product-searches.service';
import { CaptureAffiliateLinkDto } from './dto/capture-affiliate-link.dto';
import { CaptureAffiliateLinkResponseDto } from './dto/capture-affiliate-link-response.dto';
import {
  AFFILIATE_LINK_CAPTURE_QUEUE,
  AffiliateLinkCaptureJobData,
  CAPTURE_AFFILIATE_LINK_JOB,
} from './jobs/affiliate-link-capture.job';
import { AutomationTaskEventsPublisher } from '../automation-tasks/events/interfaces/automation-task-events.publisher';

@Injectable()
export class AffiliateLinkCaptureService {
  private readonly logger = new Logger(AffiliateLinkCaptureService.name);

  constructor(
    @InjectQueue(AFFILIATE_LINK_CAPTURE_QUEUE)
    private readonly captureQueue: Queue<AffiliateLinkCaptureJobData>,
    private readonly automationTasksService: AutomationTasksService,
    private readonly dependenciesService: AutomationTaskDependenciesService,
    private readonly searchesService: MarketplaceProductSearchesService,
    private readonly eventsPublisher: AutomationTaskEventsPublisher,
  ) {}

  async capture(
    input: CaptureAffiliateLinkDto,
  ): Promise<CaptureAffiliateLinkResponseDto> {
    const originSearch = input.searchId
      ? await this.searchesService.findById(input.searchId)
      : null;
    const task = await this.automationTasksService.create({
      type: AutomationTaskType.AffiliateLinkCapture,
      marketplace: input.marketplace,
    });

    if (originSearch) {
      await this.dependenciesService.add(originSearch.taskId, task.id);
    }

    await this.captureQueue.add(CAPTURE_AFFILIATE_LINK_JOB, {
      taskId: task.id,
      productId: input.productId,
      marketplace: input.marketplace,
      originalProductUrl: input.originalProductUrl,
    });

    try {
      await this.eventsPublisher.publish('task.created', {
        id: task.id,
        type: task.type,
        status: task.status,
        marketplace: task.marketplace,
        updatedAt: task.updatedAt,
        productId: input.productId,
        ...(originSearch ? { searchId: originSearch.searchId } : {}),
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish task.created event for task ${task.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    return {
      taskId: task.id,
      statusUrl: `/automation-tasks/${task.id}`,
    };
  }
}
