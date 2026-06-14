import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { AutomationTaskEventsAccessPolicy } from './automation-task-events-access.policy';

@Injectable()
export class AutomationTaskEventsAccessService implements AutomationTaskEventsAccessPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async isOnlyRegisteredUser(userId: string): Promise<boolean> {
    const users = await this.prisma.user.findMany({
      take: 2,
      select: { id: true },
    });

    return users.length === 1 && users[0].id === userId;
  }
}
