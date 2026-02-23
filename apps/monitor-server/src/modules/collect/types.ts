export type MonitorEnv = "dev" | "test" | "prod";

export interface MonitorEventData {
  name: string;
  props?: Record<string, unknown>;
}

export interface MonitorErrorData {
  message: string;
  stack?: string;
  type?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}

interface BasePayload {
  timestamp: number;
  appId?: string;
  env?: MonitorEnv;
  release?: string;
  userId?: string;
}

export interface EventPayload extends BasePayload {
  type: "event";
  data: MonitorEventData;
}

export interface ErrorPayload extends BasePayload {
  type: "error";
  data: MonitorErrorData;
}

export type CollectPayload = EventPayload | ErrorPayload;
