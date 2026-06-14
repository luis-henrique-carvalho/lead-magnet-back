export abstract class AutomationTaskEventsAccessPolicy {
  abstract isOnlyRegisteredUser(userId: string): Promise<boolean>;
}
