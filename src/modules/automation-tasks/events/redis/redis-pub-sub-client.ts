export type RedisMessageListener = (channel: string, message: string) => void;

export interface RedisPubSubClient {
  publish(channel: string, message: string): Promise<unknown>;
  subscribe(channel: string): Promise<unknown>;
  unsubscribe(channel: string): Promise<unknown>;
  on(event: 'message', listener: RedisMessageListener): unknown;
  off(event: 'message', listener: RedisMessageListener): unknown;
  quit(): Promise<unknown>;
}

export const AUTOMATION_TASK_EVENTS_REDIS_PUBLISHER = Symbol(
  'AUTOMATION_TASK_EVENTS_REDIS_PUBLISHER',
);
export const AUTOMATION_TASK_EVENTS_REDIS_SUBSCRIBER = Symbol(
  'AUTOMATION_TASK_EVENTS_REDIS_SUBSCRIBER',
);
export const AUTOMATION_TASK_EVENTS_CHANNEL = 'automation-task-events';
