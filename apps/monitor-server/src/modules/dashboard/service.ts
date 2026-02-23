import { fetchEventRows, fetchRecentErrors } from "./repository";
import type {
  ClsTrendPoint,
  DashboardKpi,
  DashboardKpiTrends,
  DashboardQuery,
  ErrorLog,
  FcpLcpTrendPoint,
  MonitorEventRow,
  PercentileTrendPoint,
  RequestErrorTrendPoint,
  RouteMetric,
  SlowResourceMetric,
  SlowRouteMetric,
} from "./types";

type RouteType = "page" | "api";

/**
 * 单个时间窗口的聚合结构。
 * 说明：数组字段保存原始样本，便于统一计算分位值。
 */
interface WindowStats {
  label: string;
  requestCount: number;
  errorCount: number;
  durations: number[];
  resourceDurations: number[];
  fcpValues: number[];
  lcpValues: number[];
  clsValues: number[];
}

interface RouteDurationStats {
  durations: number[];
}

interface ResourceDurationStats {
  name: string;
  initiatorType: string;
  durations: number[];
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DAY_WINDOW_THRESHOLD_MS = 48 * HOUR_MS;

/**
 * 将 unknown 安全转换为 number。
 * 支持有限数字和可解析数字字符串；其它情况返回 null。
 */
const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/**
 * 从 URL 或相对路径中提取 pathname。
 * 例如：
 * - https://a.com/api/v1/x?foo=1 -> /api/v1/x
 * - /api/v1/x?foo=1 -> /api/v1/x
 */
const extractPath = (urlLike: unknown): string | null => {
  if (typeof urlLike !== "string" || !urlLike.trim()) return null;
  try {
    if (urlLike.startsWith("http://") || urlLike.startsWith("https://")) {
      return new URL(urlLike).pathname || "/";
    }
    return urlLike.split("?")[0] || "/";
  } catch {
    return null;
  }
};

/**
 * 标准化 HTTP 方法。
 * 非字符串或空值统一回退为 GET。
 */
const toHttpMethod = (value: unknown): string => {
  if (typeof value !== "string") return "GET";
  const method = value.trim().toUpperCase();
  return method || "GET";
};

/**
 * 解析资源耗时样本列表。
 * 仅保留 duration 有效且 >= 0 的样本。
 */
const toResourceSamples = (
  value: unknown,
): Array<{ name: string; initiatorType: string; duration: number }> => {
  if (!Array.isArray(value)) return [];
  const resources: Array<{ name: string; initiatorType: string; duration: number }> = [];
  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const entry = item as Record<string, unknown>;
    const duration = toNumber(entry.duration);
    if (duration === null || duration < 0) return;
    const rawName = typeof entry.name === "string" ? entry.name.trim() : "";
    const rawInitiatorType =
      typeof entry.initiatorType === "string" ? entry.initiatorType.trim() : "";
    const normalizedInitiatorType = rawInitiatorType.toLowerCase() === "image" ? "img" : rawInitiatorType.toLowerCase();
    resources.push({
      name: rawName || "[unknown]",
      initiatorType: normalizedInitiatorType,
      duration,
    });
  });
  return resources;
};

/**
 * 线性插值法计算分位值。
 * 前置条件：输入数组必须已按升序排序。
 */
const quantile = (sorted: number[], q: number): number => {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0] ?? 0;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const loValue = sorted[lo] ?? 0;
  const hiValue = sorted[hi] ?? loValue;
  if (lo === hi) return loValue;
  const ratio = idx - lo;
  return loValue * (1 - ratio) + hiValue * ratio;
};

/**
 * 统一计算 p75/p90/p99。
 */
const percentile3 = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p75: Number(quantile(sorted, 0.75).toFixed(4)),
    p90: Number(quantile(sorted, 0.9).toFixed(4)),
    p99: Number(quantile(sorted, 0.99).toFixed(4)),
  };
};

/**
 * 构建对齐后的时间窗口。
 * 短区间按小时窗，长区间按天窗。
 */
type WindowGranularity = "hour" | "day";

/**
 * 根据查询区间选择窗口粒度（小时/天）。
 */
const resolveWindowGranularity = (from: Date, to: Date): WindowGranularity => {
  const durationMs = Math.max(0, to.getTime() - from.getTime());
  return durationMs > DAY_WINDOW_THRESHOLD_MS ? "day" : "hour";
};

/**
 * 按粒度生成时间窗口（start + label）。
 */
const buildWindows = (from: Date, to: Date): Array<{ start: number; label: string }> => {
  const granularity = resolveWindowGranularity(from, to);
  const stepMs = granularity === "day" ? DAY_MS : HOUR_MS;
  const start = new Date(from);
  if (granularity === "day") {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMinutes(0, 0, 0);
  }
  const end = new Date(to);
  if (granularity === "day") {
    end.setHours(0, 0, 0, 0);
  } else {
    end.setMinutes(0, 0, 0);
  }

  const windows: Array<{ start: number; label: string }> = [];
  for (let ts = start.getTime(); ts <= end.getTime(); ts += stepMs) {
    windows.push({
      start: ts,
      label: new Date(ts).toISOString(),
    });
  }
  return windows;
};

/**
 * 根据事件时间戳定位其所在窗口索引。
 * 采用倒序扫描以优先命中近期数据。
 */
const getWindowIndex = (windows: Array<{ start: number }>, timestampMs: number): number => {
  for (let i = windows.length - 1; i >= 0; i -= 1) {
    const window = windows[i];
    if (!window) continue;
    if (timestampMs >= window.start) return i;
  }
  return -1;
};

/**
 * 按查询区间创建空的窗口聚合容器。
 */
const buildEmptyStats = (query: DashboardQuery): WindowStats[] =>
  buildWindows(query.from, query.to).map((w) => ({
    label: w.label,
    requestCount: 0,
    errorCount: 0,
    durations: [],
    resourceDurations: [],
    fcpValues: [],
    lcpValues: [],
    clsValues: [],
  }));

/**
 * 仪表盘核心聚合方法。
 * 聚合口径：
 * - request：请求量、错误量、请求耗时（ms）
 * - page-view：页面路由分布
 * - performance-paint：FCP 样本（ms -> s）
 * - performance-resource：资源耗时样本（ms）
 * - performance-listening：LCP（ms -> s）与 CLS
 */
const aggregateRows = (rows: MonitorEventRow[], query: DashboardQuery) => {
  const windows = buildWindows(query.from, query.to);
  const stats = buildEmptyStats(query);
  const globalDurations: number[] = [];
  const routeCounter: Record<RouteType, Record<string, number>> = { page: {}, api: {} };
  const routeDurationCounter: Record<"api" | "request", Record<string, RouteDurationStats>> = {
    api: {},
    request: {},
  };
  const resourceDurationCounter: Record<string, ResourceDurationStats> = {};

  for (const row of rows) {
    const occurredMs = new Date(row.occurred_at).getTime();
    if (Number.isNaN(occurredMs)) continue;
    const idx = getWindowIndex(windows, occurredMs);
    if (idx < 0 || idx >= stats.length) continue;
    const bucket = stats[idx];
    if (!bucket) continue;
    const props = (row.props ?? {}) as Record<string, unknown>;

    if (row.event_name === "request") {
      bucket.requestCount += 1;
      const duration = toNumber(props.duration);
      if (duration !== null && duration >= 0) {
        bucket.durations.push(duration);
        globalDurations.push(duration);
      }

      const ok = props.ok;
      const status = toNumber(props.status);
      const isError = ok === false || (status !== null && status >= 400);
      if (isError) bucket.errorCount += 1;

      const path = extractPath(props.url);
      const method = toHttpMethod(props.method);
      const requestKey = `${method} ${path ?? "[unknown]"}`;
      if (duration !== null && duration >= 0) {
        const current = routeDurationCounter.request[requestKey] ?? { durations: [] };
        current.durations.push(duration);
        routeDurationCounter.request[requestKey] = current;
      }

      if (path?.startsWith("/api")) {
        routeCounter.api[path] = (routeCounter.api[path] ?? 0) + 1;
        if (duration !== null && duration >= 0) {
          const current = routeDurationCounter.api[path] ?? { durations: [] };
          current.durations.push(duration);
          routeDurationCounter.api[path] = current;
        }
      }
      continue;
    }

    if (row.event_name === "page-view") {
      const path = extractPath(props.url);
      if (path) routeCounter.page[path] = (routeCounter.page[path] ?? 0) + 1;
      continue;
    }

    if (row.event_name === "performance-paint") {
      const paints = props.paints as Record<string, unknown> | undefined;
      const fcpMs = paints ? toNumber(paints.fcp) : null;
      if (fcpMs !== null && fcpMs >= 0) bucket.fcpValues.push(fcpMs / 1000);
      continue;
    }

    if (row.event_name === "performance-resource") {
      const resourceSamples = toResourceSamples(props.resources);
      resourceSamples.forEach((item) => {
        bucket.resourceDurations.push(item.duration);
        const key = `${item.initiatorType}|${item.name}`;
        const current = resourceDurationCounter[key] ?? {
          name: item.name,
          initiatorType: item.initiatorType,
          durations: [],
        };
        current.durations.push(item.duration);
        resourceDurationCounter[key] = current;
      });
      continue;
    }

    if (row.event_name === "performance-listening") {
      const lcpMs = toNumber(props.lcp);
      const cls = toNumber(props.cls);
      if (lcpMs !== null && lcpMs >= 0) bucket.lcpValues.push(lcpMs / 1000);
      if (cls !== null && cls >= 0) bucket.clsValues.push(cls);
    }
  }

  return { stats, globalDurations, routeCounter, routeDurationCounter, resourceDurationCounter };
};

/**
 * 将路由计数转换为百分比结构。
 * 百分比以 Top-N 子集总和为分母。
 */
const toRouteMetrics = (counter: Record<string, number>, limit: number): RouteMetric[] => {
  const entries = Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (!total) return [];
  return entries.map(([path, count]) => ({
    path,
    percentage: Number(((count / total) * 100).toFixed(2)),
  }));
};

/**
 * 将路由耗时聚合转换为慢路由列表，并按平均耗时降序取前 N。
 */
const toSlowRouteMetrics = (counter: Record<string, RouteDurationStats>, limit: number): SlowRouteMetric[] =>
  Object.entries(counter)
    .map(([path, stats]) => ({
      path,
      avgDurationMs: Number(
        quantile([...stats.durations].sort((a, b) => a - b), 0.95).toFixed(2),
      ),
      requestCount: stats.durations.length,
    }))
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
    .slice(0, limit);

/**
 * 将资源耗时聚合转换为慢资源列表，并按平均耗时降序取前 N。
 */
const toSlowResourceMetrics = (
  counter: Record<string, ResourceDurationStats>,
  limit: number,
): SlowResourceMetric[] =>
  Object.values(counter)
    .map((stats) => ({
      name: stats.name,
      initiatorType: stats.initiatorType,
      avgDurationMs: Number(
        quantile([...stats.durations].sort((a, b) => a - b), 0.95).toFixed(2),
      ),
      sampleCount: stats.durations.length,
    }))
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
    .slice(0, limit);

const buildDashboardKpis = (stats: WindowStats[], globalDurations: number[]): DashboardKpi => {
  const totalRequests = stats.reduce((sum, s) => sum + s.requestCount, 0);
  const totalErrors = stats.reduce((sum, s) => sum + s.errorCount, 0);
  const sortedDurations = [...globalDurations].sort((a, b) => a - b);

  return {
    requests: totalRequests,
    errorRate: totalRequests ? totalErrors / totalRequests : 0,
    p75Latency: Number(quantile(sortedDurations, 0.75).toFixed(2)),
    p95Latency: Number(quantile(sortedDurations, 0.95).toFixed(2)),
    p99Latency: Number(quantile(sortedDurations, 0.99).toFixed(2)),
  };
};

const calcTrendPercent = (current: number, previous: number, precision = 2): number => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return Number((((current - previous) / previous) * 100).toFixed(precision));
};

const buildKpiTrends = (current: DashboardKpi, previous: DashboardKpi): DashboardKpiTrends => ({
  requests: calcTrendPercent(current.requests, previous.requests, 2),
  errorRate: calcTrendPercent(current.errorRate, previous.errorRate, 2),
  p75Latency: calcTrendPercent(current.p75Latency, previous.p75Latency, 2),
  p95Latency: calcTrendPercent(current.p95Latency, previous.p95Latency, 2),
  p99Latency: calcTrendPercent(current.p99Latency, previous.p99Latency, 2),
});

/**
 * 生成仪表盘总览数据。
 * 返回内容包含：KPI、近期错误列表、Top API 路由、Top 慢请求、Top 慢资源、Top 页面路由。
 */
export const getDashboardOverview = async (query: DashboardQuery) => {
  const durationMs = Math.max(1, query.to.getTime() - query.from.getTime());
  const previousQuery: DashboardQuery = {
    from: new Date(query.from.getTime() - durationMs),
    to: new Date(query.from.getTime()),
    ...(query.appId ? { appId: query.appId } : {}),
    ...(query.env ? { env: query.env } : {}),
  };

  const [events, previousEvents, errors] = await Promise.all([
    fetchEventRows(query),
    fetchEventRows(previousQuery),
    fetchRecentErrors(query, 20),
  ]);
  const { stats, globalDurations, routeCounter, routeDurationCounter, resourceDurationCounter } =
    aggregateRows(events, query);
  const previousAggregate = aggregateRows(previousEvents, previousQuery);

  const kpis = buildDashboardKpis(stats, globalDurations);
  const previousKpis = buildDashboardKpis(previousAggregate.stats, previousAggregate.globalDurations);
  const kpiTrends = buildKpiTrends(kpis, previousKpis);

  const recentErrors: ErrorLog[] = errors.map((item, idx) => ({
    id: String(item.id ?? `${item.occurred_at}-${idx}`),
    type: item.error_type ?? "UnknownError",
    message: item.message,
    timestamp: item.occurred_at,
    ...(item.filename !== null ? { filename: item.filename } : {}),
    ...(item.lineno !== null ? { lineno: item.lineno } : {}),
    ...(item.colno !== null ? { colno: item.colno } : {}),
    ...(item.stack !== null ? { stack: item.stack } : {}),
  }));

  return {
    kpis,
    kpiTrends,
    recentErrors,
    topApiRoutes: toRouteMetrics(routeCounter.api, 10),
    topSlowRequests: toSlowRouteMetrics(routeDurationCounter.request, 10),
    topSlowResources: toSlowResourceMetrics(resourceDurationCounter, 10),
    topPageRoutes: toRouteMetrics(routeCounter.page, 10),
  };
};

/**
 * 生成四块核心图表所需的趋势数据。
 * 包含：请求与错误率、延迟分位、FCP/LCP 分位、CLS 分位。
 */
export const getDashboardCharts = async (query: DashboardQuery) => {
  const events = await fetchEventRows(query);
  const { stats } = aggregateRows(events, query);

  const requestErrorTrend: RequestErrorTrendPoint[] = stats.map((s) => ({
    timeWindow: s.label,
    requests: s.requestCount,
    errorRate: s.requestCount ? Number((s.errorCount / s.requestCount).toFixed(4)) : 0,
  }));

  const latencyPercentileTrend: PercentileTrendPoint[] = stats.map((s) => {
    const sorted = [...s.durations].sort((a, b) => a - b);
    return {
      timeWindow: s.label,
      p75: Number(quantile(sorted, 0.75).toFixed(2)),
      p95: Number(quantile(sorted, 0.95).toFixed(2)),
      p99: Number(quantile(sorted, 0.99).toFixed(2)),
    };
  });

  const resourcePercentileTrend: PercentileTrendPoint[] = stats.map((s) => {
    const sorted = [...s.resourceDurations].sort((a, b) => a - b);
    return {
      timeWindow: s.label,
      p75: Number(quantile(sorted, 0.75).toFixed(2)),
      p95: Number(quantile(sorted, 0.95).toFixed(2)),
      p99: Number(quantile(sorted, 0.99).toFixed(2)),
    };
  });

  const fcpLcpTrend: FcpLcpTrendPoint[] = stats.map((s) => {
    const fcpQ = percentile3(s.fcpValues);
    const lcpQ = percentile3(s.lcpValues);
    return {
      timeWindow: s.label,
      fcpP75: Number(fcpQ.p75.toFixed(3)),
      fcpP90: Number(fcpQ.p90.toFixed(3)),
      fcpP99: Number(fcpQ.p99.toFixed(3)),
      lcpP75: Number(lcpQ.p75.toFixed(3)),
      lcpP90: Number(lcpQ.p90.toFixed(3)),
      lcpP99: Number(lcpQ.p99.toFixed(3)),
    };
  });

  const clsTrend: ClsTrendPoint[] = stats.map((s) => {
    const clsQ = percentile3(s.clsValues);
    return {
      timeWindow: s.label,
      clsP75: clsQ.p75,
      clsP90: clsQ.p90,
      clsP99: clsQ.p99,
    };
  });

  return { requestErrorTrend, latencyPercentileTrend, resourcePercentileTrend, fcpLcpTrend, clsTrend };
};

/**
 * 查询路由分布数据。
 * - type=api：统计 request.url 中 /api 路径
 * - type=page：仅统计 page-view.url（页面访问流量）
 */
export const getDashboardRoutes = async (
  query: DashboardQuery,
  type: RouteType = "api",
  limit = 10,
) => {
  const events = await fetchEventRows(query);
  const { routeCounter } = aggregateRows(events, query);
  return {
    type,
    routes: toRouteMetrics(type === "api" ? routeCounter.api : routeCounter.page, limit),
  };
};

/**
 * 查询近期错误列表。
 * 这里只做字段整形，排序与筛选由 repository 负责。
 */
export const getDashboardErrors = async (query: DashboardQuery, limit = 20) => {
  const rows = await fetchRecentErrors(query, limit);
  return rows.map((item, idx) => ({
    id: String(item.id ?? `${item.occurred_at}-${idx}`),
    type: item.error_type ?? "UnknownError",
    message: item.message,
    timestamp: item.occurred_at,
    ...(item.filename !== null ? { filename: item.filename } : {}),
    ...(item.lineno !== null ? { lineno: item.lineno } : {}),
    ...(item.colno !== null ? { colno: item.colno } : {}),
    ...(item.stack !== null ? { stack: item.stack } : {}),
  }));
};

