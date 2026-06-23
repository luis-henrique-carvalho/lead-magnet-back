import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { AutomationTasksService } from '../../../automation-tasks/automation-tasks.service';
import { AutomationErrorType } from '../../../../shared/enums/automation-error-type.enum';
import { MarketplaceProductSearchError } from '../../providers/marketplace-product-search.error';
import { MarketplaceProductProviderRegistry } from '../../providers/marketplace-product-provider.registry';
import { MarketplaceProductsService } from '../../products/marketplace-products.service';
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
    private readonly marketplaceProductsService: MarketplaceProductsService,
  ) {
    super();
  }

  async process(
    job: Job<MarketplaceProductSearchJobData>,
  ): Promise<MarketplaceProductSearchJobResult | void> {
    const { taskId, searchId, marketplace, query, category, limit } = job.data;
    const jobId = String(job.id ?? taskId);

    await this.automationTasksService.markProcessing(taskId, jobId);

    try {
      const provider = this.providerRegistry.getProvider(marketplace);
      const products = await provider.searchProducts({
        marketplace,
        query,
        category,
        limit,
      });
      const savedCount =
        await this.marketplaceProductsService.saveSearchResults(
          searchId,
          products,
          products.length,
        );
      const result: MarketplaceProductSearchJobResult = {
        searchId,
        requestedCount: limit,
        foundCount: products.length,
        savedCount,
      };

      await this.automationTasksService.markCompleted(taskId, jobId, result);

      return result;
    } catch (error) {
      const mappedError = this.mapError(error);

      if (this.requiresManualAction(mappedError.errorType)) {
        this.logger.warn(
          `Product search requires manual action for task ${taskId}: ${mappedError.message}`,
        );
        await this.automationTasksService.markManualRequired(
          taskId,
          jobId,
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
        jobId,
        mappedError.message,
        mappedError.errorType,
      );

      throw error;
    }
  }

  private mapError(error: unknown): MappedAutomationError {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const normalizedMessage = message.toLowerCase();

    if (error instanceof MarketplaceProductSearchError) {
      return {
        message,
        errorType: error.errorType,
      };
    }

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

    if (
      normalizedMessage.includes('session') ||
      normalizedMessage.includes('login') ||
      normalizedMessage.includes('authenticated')
    ) {
      return {
        message,
        errorType: AutomationErrorType.SessionInvalid,
      };
    }

    if (
      normalizedMessage.includes('layout') ||
      normalizedMessage.includes('selector') ||
      normalizedMessage.includes('not found')
    ) {
      return {
        message,
        errorType: AutomationErrorType.LayoutChanged,
      };
    }

    if (
      normalizedMessage.includes('too many requests') ||
      normalizedMessage.includes('rate limit') ||
      this.hasErrorCode(error, 'RATE_LIMITED')
    ) {
      return {
        message,
        errorType: AutomationErrorType.Throttling,
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

  private requiresManualAction(errorType: AutomationErrorType): boolean {
    return [
      AutomationErrorType.AuthError,
      AutomationErrorType.CaptchaRequired,
      AutomationErrorType.LayoutChanged,
      AutomationErrorType.ManualRequired,
      AutomationErrorType.SessionInvalid,
    ].includes(errorType);
  }
}
