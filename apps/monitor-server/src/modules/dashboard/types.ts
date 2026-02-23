import type { MonitorEnv } from "../collect/types";

export interface DashboardQuery {
  from: Date;
  to: Date;
  appId?: string;
  env?: MonitorEnv;
}

export interface MonitorEventRow {
  occurred_at: string;
  event_name: string;
  props: Record<string, unknown> | null;
  app_id: string | null;
  env: MonitorEnv | null;
}

export interface MonitorErrorRow {
  id?: string | number;
  occurred_at: string;
  message: string;
  error_type: string | null;
  filename: string | null;
  lineno: number | null;
  colno: number | null;
  stack: string | null;
  app_id: string | null;
  env: MonitorEnv | null;
}

export interface DashboardKpi {
  requests: number;
  errorRate: number;
  p75Latency: number;
  p95Latency: number;
  p99Latency: number;
}

export interface DashboardKpiTrends {
  requests: number;
  errorRate: number;
  p75Latency: number;
  p95Latency: number;
  p99Latency: number;
}

export interface RequestErrorTrendPoint {
  timeWindow: string;
  requests: number;
  errorRate: number;
}

export interface PercentileTrendPoint {
  timeWindow: string;
  p75: number;
  p95: number;
  p99: number;
}

export interface FcpLcpTrendPoint {
  timeWindow: string;
  fcpP75: number;
  fcpP90: number;
  fcpP99: number;
  lcpP75: number;
  lcpP90: number;
  lcpP99: number;
}

export interface ClsTrendPoint {
  timeWindow: string;
  clsP75: number;
  clsP90: number;
  clsP99: number;
}

export interface RouteMetric {
  path: string;
  percentage: number;
}

export interface SlowRouteMetric {
  path: string;
  avgDurationMs: number;
  requestCount: number;
}

export interface SlowResourceMetric {
  name: string;
  initiatorType: string;
  avgDurationMs: number;
  sampleCount: number;
}

export interface ErrorLog {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
}
