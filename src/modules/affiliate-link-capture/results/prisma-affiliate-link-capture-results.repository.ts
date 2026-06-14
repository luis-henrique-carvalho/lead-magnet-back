import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { AutomationTaskType } from '../../../shared/enums/automation-task-type.enum';
import {
  AffiliateLinkCaptureResultsRepository,
  SaveAffiliateLinkCaptureResultInput,
} from './affiliate-link-capture-results.repository';

@Injectable()
export class PrismaAffiliateLinkCaptureResultsRepository implements AffiliateLinkCaptureResultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: SaveAffiliateLinkCaptureResultInput): Promise<void> {
    const task = await this.prisma.automationTask.findUnique({
      where: { id: input.taskId },
      select: { type: true },
    });

    if (task?.type !== AutomationTaskType.AffiliateLinkCapture) {
      throw new Error(
        `Task ${input.taskId} is not an affiliate link capture task`,
      );
    }

    const product = await this.prisma.marketplaceProduct.findUnique({
      where: { id: input.productId },
      select: { id: true },
    });

    await this.prisma.affiliateLinkCaptureResult.upsert({
      where: { taskId: input.taskId },
      create: {
        taskId: input.taskId,
        sourceProductId: input.productId,
        productId: product?.id,
        marketplace: input.marketplace,
        originalProductUrl: input.originalProductUrl,
        capturedAffiliateUrl: input.capturedAffiliateUrl,
      },
      update: {
        productId: product?.id,
        capturedAffiliateUrl: input.capturedAffiliateUrl,
      },
    });
  }
}
