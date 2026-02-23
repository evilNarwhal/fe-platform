export interface KPIData {
  label: string;
  value: string;
  trend: number;
  unit?: string;
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

export interface ChartData {
  time: string;
  value: number;
}

export type PercentileKey = "p75" | "p95" | "p99";
export type CoreWebVitalPercentileKey = "p75" | "p90" | "p99";

export interface PercentileTrendData {
  timeWindow: string;
  p75: number;
  p95: number;
  p99: number;
}

export interface RequestErrorTrendData {
  timeWindow: string;
  requests: number;
  errorRate: number;
}

export interface FcpLcpTrendData {
  timeWindow: string;
  fcpP75: number;
  fcpP90: number;
  fcpP99: number;
  lcpP75: number;
  lcpP90: number;
  lcpP99: number;
}

export interface ClsTrendData {
  timeWindow: string;
  clsP75: number;
  clsP90: number;
  clsP99: number;
}

export interface DashboardOverviewResponse {
  kpis: {
    requests: number;
    errorRate: number;
    p75Latency: number;
    p95Latency: number;
    p99Latency: number;
  };
  kpiTrends: {
    requests: number;
    errorRate: number;
    p75Latency: number;
    p95Latency: number;
    p99Latency: number;
  };
  recentErrors: ErrorLog[];
  topApiRoutes: RouteMetric[];
  topSlowRequests: SlowRouteMetric[];
  topSlowResources: SlowResourceMetric[];
  topPageRoutes: RouteMetric[];
}

export interface DashboardChartsResponse {
  requestErrorTrend: RequestErrorTrendData[];
  latencyPercentileTrend: PercentileTrendData[];
  resourcePercentileTrend: PercentileTrendData[];
  fcpLcpTrend: FcpLcpTrendData[];
  clsTrend: ClsTrendData[];
}
