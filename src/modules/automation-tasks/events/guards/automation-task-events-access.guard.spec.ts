import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AutomationTaskEventsAccessGuard } from './automation-task-events-access.guard';
import { AutomationTaskEventsAccessPolicy } from '../policies/automation-task-events-access.policy';

describe('AutomationTaskEventsAccessGuard', () => {
  const request = (userId?: string) => ({
    session: userId ? { user: { id: userId } } : undefined,
  });

  const context = (value: object) =>
    ({
      switchToHttp: () => ({ getRequest: () => value }),
    }) as ExecutionContext;

  it('allows the only registered user to open the global stream', async () => {
    const accessService: AutomationTaskEventsAccessPolicy = {
      isOnlyRegisteredUser: jest.fn().mockResolvedValue(true),
    };
    const guard = new AutomationTaskEventsAccessGuard(accessService);

    await expect(guard.canActivate(context(request('user-id')))).resolves.toBe(
      true,
    );
  });

  it('fails closed when more than one account can access global tasks', async () => {
    const accessService: AutomationTaskEventsAccessPolicy = {
      isOnlyRegisteredUser: jest.fn().mockResolvedValue(false),
    };
    const guard = new AutomationTaskEventsAccessGuard(accessService);

    await expect(
      guard.canActivate(context(request('user-id'))),
    ).rejects.toThrow(ForbiddenException);
  });
});
