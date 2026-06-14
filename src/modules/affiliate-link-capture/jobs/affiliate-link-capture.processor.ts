import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';
import { AutomationTasksService } from '../../automation-tasks/automation-tasks.service';
import { AffiliateLinkCaptureManualRequiredError } from '../errors/affiliate-link-capture-manual-required.error';
import { AffiliateLinkCaptureProviderRegistry } from '../providers/affiliate-link-capture-provider.registry';
import { AffiliateLinkCaptureResultsService } from '../results/affiliate-link-capture-results.service';
import {
  AFFILIATE_LINK_CAPTURE_QUEUE,
  AffiliateLinkCaptureJobData,
  AffiliateLinkCaptureJobResult,
} from './affiliate-link-capture.job';

@Processor(AFFILIATE_LINK_CAPTURE_QUEUE)
export class AffiliateLinkCaptureProcessor extends WorkerHost {
  private readonly logger = new Logger(AffiliateLinkCaptureProcessor.name);

  constructor(
    private readonly providerRegistry: AffiliateLinkCaptureProviderRegistry,
    private readonly automationTasksService: AutomationTasksService,
    private readonly resultsService: AffiliateLinkCaptureResultsService,
  ) {
    super();
  }

  async process(
    job: Job<AffiliateLinkCaptureJobData>,
  ): Promise<AffiliateLinkCaptureJobResult | void> {
    const { taskId, productId, marketplace, originalProductUrl } = job.data;
    const jobId = String(job.id ?? taskId);

    await this.automationTasksService.markProcessing(taskId, jobId, {
      productId,
    });

    try {
      const provider = this.providerRegistry.getProvider(marketplace);
      const capturedLink = await provider.captureAffiliateLink({
        productId,
        marketplace,
        originalProductUrl,
      });
      const result: AffiliateLinkCaptureJobResult = {
        productId,
        marketplace,
        originalProductUrl,
        capturedAffiliateUrl: capturedLink.capturedAffiliateUrl,
      };

      await this.resultsService.save({ taskId, ...result });
      await this.automationTasksService.markCompleted(taskId, jobId, result);

      return result;
    } catch (error) {
      if (error instanceof AffiliateLinkCaptureManualRequiredError) {
        this.logger.warn(
          `Affiliate link capture requires manual action for task ${taskId}: ${error.message}`,
        );
        await this.automationTasksService.markManualRequired(
          taskId,
          jobId,
          error.message,
          error.errorType,
        );
        return;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Affiliate link capture failed for task ${taskId}: ${message}`,
      );
      await this.automationTasksService.markFailed(
        taskId,
        jobId,
        message,
        AutomationErrorType.InternalError,
      );

      throw error;
    }
  }
}
