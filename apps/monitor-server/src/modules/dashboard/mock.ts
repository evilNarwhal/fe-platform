import type {
  DashboardQuery,
  ErrorLog,
  FcpLcpTrendPoint,
  PercentileTrendPoint,
  RequestErrorTrendPoint,
  RouteMetric,
  ClsTrendPoint,
  SlowResourceMetric,
  SlowRouteMetric,
} from "./types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DAY_WINDOW_THRESHOLD_MS = 48 * HOUR_MS;

const buildWindows = (from: Date, to: Date): string[] => {
  const durationMs = Math.max(0, to.getTime() - from.getTime());
  const useDayWindow = durationMs > DAY_WINDOW_THRESHOLD_MS;
  const stepMs = useDayWindow ? DAY_MS : HOUR_MS;
  const start = new Date(from);
  if (useDayWindow) {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMinutes(0, 0, 0);
  }
  const end = new Date(to);
  if (useDayWindow) {
    end.setHours(0, 0, 0, 0);
  } else {
    end.setMinutes(0, 0, 0);
  }

  const labels: string[] = [];
  for (let ts = start.getTime(); ts <= end.getTime(); ts += stepMs) {
    labels.push(new Date(ts).toISOString());
  }
  return labels;
};

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

const createRouteMetrics = (kind: "api" | "page"): RouteMetric[] => {
  const apiSeeds = ["/api/v1/auth", "/api/v1/user/profile", "/api/v1/orders", "/api/v1/analytics", "/api/v1/config"];
  const pageSeeds = ["/", "/dashboard", "/overview", "/settings", "/alerts"];
  const seeds = kind === "api" ? apiSeeds : pageSeeds;
  const raw = seeds.map((path) => ({ path, value: rand(10, 40) }));
  const total = raw.reduce((sum, v) => sum + v.value, 0);
  return raw.map((item) => ({
    path: item.path,
    percentage: Number(((item.value / total) * 100).toFixed(2)),
  }));
};

const createSlowRequestMetrics = (): SlowRouteMetric[] => {
  const routes = ["/api/v1/analytics", "/api/v1/orders", "/api/v1/user/profile", "/api/v1/config", "/api/v1/auth"];
  return routes
    .map((path) => ({
      path,
      avgDurationMs: Number(rand(140, 520).toFixed(2)),
      requestCount: Math.round(rand(60, 260)),
    }))
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs);
};

const createSlowResourceMetrics = (): SlowResourceMetric[] => {
  const resources = [
    { name: "cdn.example.com/assets/main.js", initiatorType: "script" },
    { name: "cdn.example.com/assets/styles.css", initiatorType: "link" },
    { name: "img.example.com/banner.webp", initiatorType: "img" },
    { name: "api.example.com/bootstrap", initiatorType: "fetch" },
    { name: "cdn.example.com/assets/font.woff2", initiatorType: "css" },
  ];
  return resources
    .map((item) => ({
      ...item,
      avgDurationMs: Number(rand(120, 680).toFixed(2)),
      sampleCount: Math.round(rand(20, 160)),
    }))
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs);
};

const createRecentErrors = (): ErrorLog[] => {
  const now = Date.now();
  return [
    { id: "err-1", type: "TypeError", message: "Cannot read properties of undefined", timestamp: new Date(now - 3 * 60 * 1000).toISOString() },
    { id: "err-2", type: "NetworkError", message: "Request /api/v1/sync failed", timestamp: new Date(now - 12 * 60 * 1000).toISOString() },
    { id: "err-3", type: "ChunkLoadError", message: "Failed to load dynamic import chunk", timestamp: new Date(now - 35 * 60 * 1000).toISOString() },
  ];
};

const createRequestErrorTrend = (windows: string[]): RequestErrorTrendPoint[] =>
  windows.map((timeWindow) => {
    const requests = Math.round(rand(800, 2600));
    const errorRate = Number(rand(0.01, 0.08).toFixed(4));
    return { timeWindow, requests, errorRate };
  });

const createLatencyPercentiles = (windows: string[]): PercentileTrendPoint[] =>
  windows.map((timeWindow) => {
    const p75 = rand(70, 140);
    const p95 = p75 + rand(20, 60);
    const p99 = p95 + rand(20, 70);
    return {
      timeWindow,
      p75: Number(p75.toFixed(2)),
      p95: Number(p95.toFixed(2)),
      p99: Number(p99.toFixed(2)),
    };
  });

const createResourcePercentiles = (windows: string[]): PercentileTrendPoint[] =>
  windows.map((timeWindow) => {
    const p75 = rand(80, 280);
    const p95 = p75 + rand(40, 160);
    const p99 = p95 + rand(40, 220);
    return {
      timeWindow,
      p75: Number(p75.toFixed(2)),
      p95: Number(p95.toFixed(2)),
      p99: Number(p99.toFixed(2)),
    };
  });

const createFcpLcpPercentiles = (windows: string[]): FcpLcpTrendPoint[] =>
  windows.map((timeWindow) => {
    const fcpP75 = rand(0.8, 1.3);
    const fcpP90 = fcpP75 + rand(0.1, 0.4);
    const fcpP99 = fcpP90 + rand(0.1, 0.5);
    const lcpP75 = rand(1.5, 2.3);
    const lcpP90 = lcpP75 + rand(0.2, 0.7);
    const lcpP99 = lcpP90 + rand(0.2, 0.8);
    return {
      timeWindow,
      fcpP75: Number(fcpP75.toFixed(3)),
      fcpP90: Number(fcpP90.toFixed(3)),
      fcpP99: Number(fcpP99.toFixed(3)),
      lcpP75: Number(lcpP75.toFixed(3)),
      lcpP90: Number(lcpP90.toFixed(3)),
      lcpP99: Number(lcpP99.toFixed(3)),
    };
  });

const createClsPercentiles = (windows: string[]): ClsTrendPoint[] =>
  windows.map((timeWindow) => {
    const clsP75 = rand(0.03, 0.08);
    const clsP90 = clsP75 + rand(0.01, 0.05);
    const clsP99 = clsP90 + rand(0.01, 0.05);
    return {
      timeWindow,
      clsP75: Number(clsP75.toFixed(4)),
      clsP90: Number(clsP90.toFixed(4)),
      clsP99: Number(clsP99.toFixed(4)),
    };
  });

export const getMockDashboardOverview = (query: DashboardQuery) => {
  const hours = Math.max(Math.ceil((query.to.getTime() - query.from.getTime()) / HOUR_MS), 1);
  const requests = Math.round(hours * rand(900, 2100));
  const errorRate = Number(rand(0.015, 0.06).toFixed(4));

  return {
    kpis: {
      requests,
      errorRate,
      p75Latency: Number(rand(60, 120).toFixed(2)),
      p95Latency: Number(rand(120, 220).toFixed(2)),
      p99Latency: Number(rand(220, 380).toFixed(2)),
    },
    kpiTrends: {
      requests: Number(rand(-18, 22).toFixed(2)),
      errorRate: Number(rand(-12, 12).toFixed(2)),
      p75Latency: Number(rand(-20, 20).toFixed(2)),
      p95Latency: Number(rand(-20, 20).toFixed(2)),
      p99Latency: Number(rand(-20, 20).toFixed(2)),
    },
    recentErrors: createRecentErrors(),
    topApiRoutes: createRouteMetrics("api"),
    topSlowRequests: createSlowRequestMetrics(),
    topSlowResources: createSlowResourceMetrics(),
    topPageRoutes: createRouteMetrics("page"),
  };
};

export const getMockDashboardCharts = (query: DashboardQuery) => {
  const windows = buildWindows(query.from, query.to);
  return {
    requestErrorTrend: createRequestErrorTrend(windows),
    latencyPercentileTrend: createLatencyPercentiles(windows),
    resourcePercentileTrend: createResourcePercentiles(windows),
    fcpLcpTrend: createFcpLcpPercentiles(windows),
    clsTrend: createClsPercentiles(windows),
  };
};

export const getMockDashboardRoutes = (type: "api" | "page", limit: number) => ({
  type,
  routes: createRouteMetrics(type).slice(0, limit),
});

export const getMockDashboardErrors = (limit: number) => createRecentErrors().slice(0, limit);
