import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';
import { AutomationTaskStatus } from '../../../shared/enums/automation-task-status.enum';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';
import type { AutomationTask } from '../automation-task.types';

export class AutomationTaskAttemptResponseDto {
  @ApiProperty()
  number!: number;

  @ApiProperty()
  jobId!: string;

  @ApiProperty({ enum: AutomationTaskStatus })
  status!: AutomationTaskStatus;

  @ApiPropertyOptional({ nullable: true })
  error!: string | null;

  @ApiPropertyOptional({ enum: AutomationErrorType, nullable: true })
  errorType!: AutomationErrorType | null;

  @ApiProperty()
  startedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  finishedAt!: Date | null;
}

export class AutomationTaskResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AutomationTaskType })
  type!: AutomationTaskType;

  @ApiPropertyOptional({ nullable: true })
  marketplace!: string | null;

  @ApiProperty({ enum: AutomationTaskStatus })
  status!: AutomationTaskStatus;

  @ApiProperty()
  statusUrl!: string;

  @ApiPropertyOptional({ type: Object, nullable: true })
  result!: unknown;

  @ApiPropertyOptional({ nullable: true })
  error!: string | null;

  @ApiPropertyOptional({ enum: AutomationErrorType, nullable: true })
  errorType!: AutomationErrorType | null;

  @ApiProperty()
  attempts!: number;

  @ApiProperty({ type: [AutomationTaskAttemptResponseDto] })
  attemptsHistory!: AutomationTaskAttemptResponseDto[];

  @ApiProperty({ type: [String] })
  pendingPredecessorTaskIds!: string[];

  @ApiPropertyOptional({ nullable: true })
  startedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  finishedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromTask(task: AutomationTask): AutomationTaskResponseDto {
    return {
      id: task.id,
      type: task.type,
      marketplace: task.marketplace,
      status: task.status,
      result: this.toPublicResult(task),
      error: task.error,
      errorType: task.errorType,
      attempts: task.attempts,
      attemptsHistory: (task.attemptsHistory ?? []).map((attempt) => ({
        number: attempt.number,
        jobId: attempt.jobId,
        status: attempt.status,
        error: attempt.error,
        errorType: attempt.errorType,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
      })),
      pendingPredecessorTaskIds: (task.successorLinks ?? [])
        .filter(
          (link) =>
            link.required &&
            link.predecessor.status !== AutomationTaskStatus.Completed,
        )
        .map((link) => link.predecessorId),
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      statusUrl: `/automation-tasks/${task.id}`,
    };
  }

  private static toPublicResult(task: AutomationTask): unknown {
    if (task.marketplaceSearch) {
      const search = task.marketplaceSearch;

      return {
        searchId: search.id,
        marketplace: search.marketplace,
        query: search.query,
        category: search.category,
        requestedCount: search.requestedLimit,
        foundCount: search.foundCount,
        savedCount: search.savedCount,
        products: search.results.map((result) => ({
          discoveredAt: result.discoveredAt,
          ...this.toPublicProduct(result.product),
        })),
      };
    }

    if (task.affiliateLinkCapture) {
      const capture = task.affiliateLinkCapture;

      return {
        productId: capture.sourceProductId,
        marketplace: capture.marketplace,
        originalProductUrl: capture.originalProductUrl,
        capturedAffiliateUrl: capture.capturedAffiliateUrl,
      };
    }

    return task.result;
  }

  private static toPublicProduct(product: unknown): Record<string, unknown> {
    if (!product || typeof product !== 'object') return {};

    const value = product as Record<string, unknown>;

    return {
      id: value.id,
      externalId: value.externalId,
      marketplace: value.marketplace,
      title: value.title,
      originalUrl: value.originalUrl,
      imageUrl: value.imageUrl,
      price: value.price,
      rating: value.rating,
      reviewsCount: value.reviewsCount,
      salesCount: value.salesCount,
      category: value.category,
    };
  }
}
