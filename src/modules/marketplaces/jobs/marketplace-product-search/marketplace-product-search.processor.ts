import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { AutomationTasksService } from '../../../automation-tasks/automation-tasks.service';
import { AutomationErrorType } from '../../../../shared/enums/automation-error-type.enum';
import { MarketplaceProductProviderRegistry } from '../../providers/marketplace-product-provider.registry';
import {
  MARKETPLACE_PRODUCT_SEARCH_QUEUE,
  MarketplaceProductSearchJobData,
  MarketplaceProductSearchJobResult,
} from './marketplace-product-search.job';

type MappedAutomationError = {
  message: string;
  errorType: AutomationErrorType;
};

@Processor(MARKETPLACE_PRODUCT_SEARCH_QUEUE)
export class MarketplaceProductSearchProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketplaceProductSearchProcessor.name);

  constructor(
    private readonly providerRegistry: MarketplaceProductProviderRegistry,
    private readonly automationTasksService: AutomationTasksService,
  ) {
    super();
  }

  async process(
    job: Job<MarketplaceProductSearchJobData>,
  ): Promise<MarketplaceProductSearchJobResult | void> {
    const { taskId, searchId, marketplace, query, category, limit } = job.data;

    await this.automationTasksService.markProcessing(taskId);

    try {
      const provider = this.providerRegistry.getProvider(marketplace);
      const products = await provider.searchProducts({
        marketplace,
        query,
        category,
        limit,
      });
      const result: MarketplaceProductSearchJobResult = {
        searchId,
        requestedCount: limit,
        foundCount: products.length,
      };

      await this.automationTasksService.markCompleted(taskId, result);

      return result;
    } catch (error) {
      const mappedError = this.mapError(error);

      if (mappedError.errorType === AutomationErrorType.CaptchaRequired) {
        this.logger.warn(
          `Product search requires manual action for task ${taskId}: ${mappedError.message}`,
        );
        await this.automationTasksService.markManualRequired(
          taskId,
          mappedError.message,
          mappedError.errorType,
        );
        return;
      }

      this.logger.error(
        `Product search failed for task ${taskId}: ${mappedError.message}`,
      );
      await this.automationTasksService.markFailed(
        taskId,
        mappedError.message,
        mappedError.errorType,
      );

      throw error;
    }
  }

  private mapError(error: unknown): MappedAutomationError {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes('captcha') ||
      this.hasErrorCode(error, 'CAPTCHA_REQUIRED')
    ) {
      return {
        message,
        errorType: AutomationErrorType.CaptchaRequired,
      };
    }

    if (
      normalizedMessage.includes('timeout') ||
      normalizedMessage.includes('timed out') ||
      this.hasErrorCode(error, 'ETIMEDOUT')
    ) {
      return {
        message,
        errorType: AutomationErrorType.Timeout,
      };
    }

    return {
      message,
      errorType: AutomationErrorType.InternalError,
    };
  }

  private hasErrorCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
