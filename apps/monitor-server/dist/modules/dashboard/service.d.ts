import type { ClsTrendPoint, DashboardKpi, DashboardKpiTrends, DashboardQuery, ErrorLog, FcpLcpTrendPoint, PercentileTrendPoint, RequestErrorTrendPoint, RouteMetric, SlowResourceMetric, SlowRouteMetric } from "./types";
type RouteType = "page" | "api";
/**
 * 生成仪表盘总览数据。
 * 返回内容包含：KPI、近期错误列表、Top API 路由、Top 慢请求、Top 慢资源、Top 页面路由。
 */
export declare const getDashboardOverview: (query: DashboardQuery) => Promise<{
    kpis: DashboardKpi;
    kpiTrends: DashboardKpiTrends;
    recentErrors: ErrorLog[];
    topApiRoutes: RouteMetric[];
    topSlowRequests: SlowRouteMetric[];
    topSlowResources: SlowResourceMetric[];
    topPageRoutes: RouteMetric[];
}>;
/**
 * 生成四块核心图表所需的趋势数据。
 * 包含：请求与错误率、延迟分位、FCP/LCP 分位、CLS 分位。
 */
export declare const getDashboardCharts: (query: DashboardQuery) => Promise<{
    requestErrorTrend: RequestErrorTrendPoint[];
    latencyPercentileTrend: PercentileTrendPoint[];
    resourcePercentileTrend: PercentileTrendPoint[];
    fcpLcpTrend: FcpLcpTrendPoint[];
    clsTrend: ClsTrendPoint[];
}>;
/**
 * 查询路由分布数据。
 * - type=api：统计 request.url 中 /api 路径
 * - type=page：仅统计 page-view.url（页面访问流量）
 */
export declare const getDashboardRoutes: (query: DashboardQuery, type?: RouteType, limit?: number) => Promise<{
    type: RouteType;
    routes: RouteMetric[];
}>;
/**
 * 查询近期错误列表。
 * 这里只做字段整形，排序与筛选由 repository 负责。
 */
export declare const getDashboardErrors: (query: DashboardQuery, limit?: number) => Promise<{
    stack?: string;
    colno?: number;
    lineno?: number;
    filename?: string;
    id: string;
    type: string;
    message: string;
    timestamp: string;
}[]>;
export {};
//# sourceMappingURL=service.d.ts.map