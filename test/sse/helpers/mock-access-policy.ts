import { AutomationTaskEventsAccessPolicy } from '../../../src/modules/automation-tasks/events/policies/automation-task-events-access.policy';

export class MockAccessPolicy implements AutomationTaskEventsAccessPolicy {
  private result = true;

  allowAccess(): void {
    this.result = true;
  }

  denyAccess(): void {
    this.result = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isOnlyRegisteredUser(_userId: string): Promise<boolean> {
    return Promise.resolve(this.result);
  }
}
