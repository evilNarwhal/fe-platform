import type { DashboardQuery, ErrorLog, FcpLcpTrendPoint, PercentileTrendPoint, RequestErrorTrendPoint, RouteMetric, ClsTrendPoint, SlowResourceMetric, SlowRouteMetric } from "./types";
export declare const getMockDashboardOverview: (query: DashboardQuery) => {
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
};
export declare const getMockDashboardCharts: (query: DashboardQuery) => {
    requestErrorTrend: RequestErrorTrendPoint[];
    latencyPercentileTrend: PercentileTrendPoint[];
    resourcePercentileTrend: PercentileTrendPoint[];
    fcpLcpTrend: FcpLcpTrendPoint[];
    clsTrend: ClsTrendPoint[];
};
export declare const getMockDashboardRoutes: (type: "api" | "page", limit: number) => {
    type: "api" | "page";
    routes: RouteMetric[];
};
export declare const getMockDashboardErrors: (limit: number) => ErrorLog[];
//# sourceMappingURL=mock.d.ts.map