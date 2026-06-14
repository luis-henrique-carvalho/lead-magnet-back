import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AutomationTaskEventsAccessPolicy } from '../policies/automation-task-events-access.policy';

type AuthenticatedRequest = {
  session?: { user?: { id?: string } };
};

@Injectable()
export class AutomationTaskEventsAccessGuard implements CanActivate {
  constructor(
    private readonly accessPolicy: AutomationTaskEventsAccessPolicy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.session?.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authentication session is required');
    }

    if (!(await this.accessPolicy.isOnlyRegisteredUser(userId))) {
      throw new ForbiddenException(
        'Global automation task events require a single-user environment',
      );
    }

    return true;
  }
}
