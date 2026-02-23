import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Globe } from "lucide-react";

import GlassCard from "@/components/GlassCard";
import {
  ClsTrendChart,
  FcpLcpTrendChart,
  PercentileTrendChart,
  RequestErrorChart,
  RouteDistributionPieChart,
} from "@/components/Charts";
import type {
  DashboardChartsResponse,
  DashboardOverviewResponse,
  ErrorLog,
  KPIData,
  RouteMetric,
  SlowResourceMetric,
  SlowRouteMetric,
} from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n, type Locale, type MessageKey } from "@/i18n";

const API_BASE = import.meta.env.VITE_MONITOR_SERVER_BASE_URL ?? "http://localhost:4000";
type RangeKey = "24h" | "7d";

interface DashboardPageProps {
  appId: string;
}

interface HoverPathProps {
  value: string;
  copied: boolean;
  onCopy: () => void;
  copiedText: string;
  copyHintText: string;
}

/**
 * 路径悬浮复制子组件。
 * 作用：在慢请求/慢资源列表中统一渲染“可截断路径 + 悬浮完整路径 + 点击复制”。
 * 管理范围：仅负责单个路径文本的交互与展示，不关心外层业务数据来源。
 */
const HoverPathWithCopy: React.FC<HoverPathProps> = ({ value, copied, onCopy, copiedText, copyHintText }) => (
  <div className="relative min-w-0 group/path flex-1">
    <span onClick={onCopy} className="block min-w-0 truncate cursor-pointer">
      {value}
    </span>
    <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 w-[min(34rem,calc(100vw-2rem))] origin-top-right rounded-xl border border-border bg-popover/95 p-2 shadow-xl opacity-0 transition-opacity duration-150 group-hover/path:pointer-events-auto group-hover/path:opacity-100">
      <div className="space-y-1">
        <p onClick={onCopy} className="break-all cursor-pointer text-[11px] font-medium text-popover-foreground">
          {value}
        </p>
        <p className="text-[10px] font-semibold text-primary">{copied ? copiedText : copyHintText}</p>
      </div>
    </div>
  </div>
);

/**
 * 将 ISO 时间格式化为本地展示字符串。
 * 作用：近期错误列表与弹窗详情中的时间展示统一入口。
 * 管理范围：仅做格式化与兜底，不参与时区计算策略。
 */
const toLocalTime = (iso: string, locale: Locale) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
};

/**
 * KPI 标题映射到 i18n key。
 * 作用：将后端返回的英文指标名转换为界面可翻译文案 key。
 * 管理范围：仅维护“展示标签 -> 翻译 key”映射，不处理数值。
 */
const getKpiLabelKey = (label: string): MessageKey | null => {
  switch (label) {
    case "Requests":
      return "kpi.requests";
    case "Error Rate":
      return "kpi.errorRate";
    case "P75 Latency":
      return "kpi.p75Latency";
    case "P95 Latency":
      return "kpi.p95Latency";
    case "P99 Latency":
      return "kpi.p99Latency";
    default:
      return null;
  }
};

/**
 * 组装 KPI 卡片展示数据。
 * 作用：把 overview 的原始指标转换为前端统一渲染结构（含格式化与默认值）。
 * 管理范围：仅负责 KPI 数据适配，不负责请求、图表和交互。
 */
const toKpiList = (overview: DashboardOverviewResponse | null, locale: Locale): KPIData[] => {
  if (!overview) {
    return [
      { label: "Requests", value: "-", trend: 0 },
      { label: "Error Rate", value: "-", trend: 0, unit: "%" },
      { label: "P75 Latency", value: "-", trend: 0, unit: "ms" },
      { label: "P95 Latency", value: "-", trend: 0, unit: "ms" },
      { label: "P99 Latency", value: "-", trend: 0, unit: "ms" },
    ];
  }

  const trends = overview.kpiTrends ?? {
    requests: 0,
    errorRate: 0,
    p75Latency: 0,
    p95Latency: 0,
    p99Latency: 0,
  };

  return [
    { label: "Requests", value: overview.kpis.requests.toLocaleString(locale === "zh" ? "zh-CN" : "en-US"), trend: trends.requests },
    { label: "Error Rate", value: (overview.kpis.errorRate * 100).toFixed(2), trend: trends.errorRate, unit: "%" },
    { label: "P75 Latency", value: overview.kpis.p75Latency.toFixed(2), trend: trends.p75Latency, unit: "ms" },
    { label: "P95 Latency", value: overview.kpis.p95Latency.toFixed(2), trend: trends.p95Latency, unit: "ms" },
    { label: "P99 Latency", value: overview.kpis.p99Latency.toFixed(2), trend: trends.p99Latency, unit: "ms" },
  ];
};

/**
 * Dashboard 主页面。
 * 作用：负责总览数据请求、时间窗切换、图表与侧栏卡片渲染、错误详情弹窗。
 * 管理范围：
 * 1) 数据状态（overview/charts/loading/error）
 * 2) 页面交互状态（range/selectedError/copiedPath）
 * 3) 将数据分发给子组件（Charts、GlassCard、Dialog）
 */
const DashboardPage: React.FC<DashboardPageProps> = ({ appId }) => {
  const { t, locale } = useI18n();
  // 路径复制提示状态：用于“已复制”文案反馈
  const [copiedPath, setCopiedPath] = useState<string>("");
  // 图表时间窗状态：24h / 7d
  const [range, setRange] = useState<RangeKey>("24h");
  // 总览接口数据（KPI、慢资源、慢请求、路由、错误）
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  // 图表接口数据（趋势图序列）
  const [charts, setCharts] = useState<DashboardChartsResponse | null>(null);
  // 请求态与错误态
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // 错误详情弹窗选中项
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  /**
   * 根据时间窗和 appId 生成查询参数。
   * 作用：作为数据请求 effect 的唯一依赖输入，控制重拉时机。
   */
  const queryRange = useMemo(() => {
    const to = new Date();
    const hours = range === "24h" ? 24 : 7 * 24;
    const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString(), appId };
  }, [range, appId]);

  /**
   * 拉取 dashboard 数据（overview + charts）。
   * 作用：当 queryRange 变化时刷新页面数据。
   * 管理范围：只负责接口请求/状态写入，不做视图逻辑判断。
   */
  useEffect(() => {
    let canceled = false;

    // 统一加载流程，包含并发请求与错误处理
    const load = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const query = new URLSearchParams(queryRange).toString();
        const [overviewRes, chartsRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/dashboard/overview?${query}`),
          fetch(`${API_BASE}/api/v1/dashboard/charts?${query}`),
        ]);

        if (!overviewRes.ok || !chartsRes.ok) {
          throw new Error(t("error.dashboardApiRequestFailed"));
        }

        const [overviewData, chartsData] = await Promise.all([
          overviewRes.json() as Promise<DashboardOverviewResponse>,
          chartsRes.json() as Promise<DashboardChartsResponse>,
        ]);

        if (canceled) return;
        setOverview(overviewData);
        setCharts(chartsData);
      } catch (error) {
        if (canceled) return;
        setLoadError(error instanceof Error ? error.message : t("error.failedToLoadDashboardData"));
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    // 触发加载，并在依赖变化/卸载时标记取消，避免过期请求回写
    void load();
    return () => {
      canceled = true;
    };
  }, [queryRange]);

  /**
   * 复制路径并短暂显示“已复制”反馈。
   * 作用：慢请求/慢资源列表的统一复制行为。
   */
  const handleCopyPath = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedPath(value);
    setTimeout(() => {
      setCopiedPath((prev) => (prev === value ? "" : prev));
    }, 1500);
  };

  /**
   * 根据相对耗时比例返回进度条颜色。
   * 作用：慢请求/慢资源列表的视觉风险分级。
   */
  const getLatencyBarColorClass = (ratio: number) => {
    if (ratio >= 0.8) return "bg-rose-500";
    if (ratio >= 0.45) return "bg-amber-500";
    return "bg-emerald-500";
  };

  /**
   * KPI 图标映射。
   * 作用：根据指标类型返回对应图标与主色。
   */
  const getKpiIcon = (label: string) => {
    if (label === "Requests") return <Clock className="h-4 w-4 text-amber-500" />;
    if (label === "Error Rate") return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    return <Clock className="h-4 w-4 text-emerald-500" />;
  };

  /**
   * 资源类型标签样式映射。
   * 作用：根据 initiatorType 渲染不同颜色标签，提升资源类型辨识度。
   */
  const getInitiatorTypeTagClass = (initiatorType: string) => {
    switch (initiatorType.toLowerCase()) {
      case "script":
        return "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/35";
      case "img":
      case "image":
        return "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/35";
      case "link":
      case "css":
        return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/35";
      case "xmlhttprequest":
      case "fetch":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/35";
      case "font":
        return "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/35";
      default:
        return "bg-muted/50 text-muted-foreground border-border dark:bg-muted/40";
    }
  };

  // KPI 卡片展示数据
  const kpis = toKpiList(overview, locale);
  // 右侧榜单数据
  const slowResources: SlowResourceMetric[] = overview?.topSlowResources ?? [];
  const slowRequests: SlowRouteMetric[] = overview?.topSlowRequests ?? [];
  const pageRoutes: RouteMetric[] = overview?.topPageRoutes ?? [];
  // 归一化进度条所需耗时的最大值 其他数据条可基于最大值按比例显示
  const maxSlowResourceDuration = slowResources.reduce((max, item) => Math.max(max, item.avgDurationMs), 0);
  const maxSlowRequestDuration = slowRequests.reduce((max, route) => Math.max(max, route.avgDurationMs), 0);

  return (
    <div className="space-y-8">
      <main className="grid grid-cols-12 gap-8">
        {/* 左侧主内容区：KPI + 性能图表 + 近期错误 */}
        <div className="col-span-12 2xl:col-span-8 space-y-8">
          {/* KPI 指标卡片区：展示请求量/错误率/延迟分位及其趋势 */}
          <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
            {kpis.map((kpi, idx) => {
              const trendValue = Object.is(kpi.trend, -0) ? 0 : kpi.trend;
              const isInverseMetric = /(latency|error rate)/i.test(kpi.label);
              const isUpTrend = trendValue >= 0;
              const isGoodTrend = isInverseMetric ? !isUpTrend : isUpTrend;

              return (
                <GlassCard key={idx} className="group hover:scale-[1.03] transition-transform duration-300">
                  <div className="mb-2 flex items-start justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {(() => {
                        const labelKey = getKpiLabelKey(kpi.label);
                        return labelKey ? t(labelKey) : kpi.label;
                      })()}
                    </p>
                    {getKpiIcon(kpi.label)}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-space text-foreground">{kpi.value}</span>
                    {kpi.unit && <span className="text-xs font-medium text-muted-foreground">{kpi.unit}</span>}
                  </div>
                  <div
                    className={`mt-3 flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      isGoodTrend
                        ? "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-500/35"
                        : "bg-rose-100/70 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-1 dark:ring-rose-500/35"
                    }`}
                  >
                    {isUpTrend ? "+" : ""}
                    {trendValue.toFixed(2)}%
                  </div>
                </GlassCard>
              );
            })}
          </section>

          {/* 性能体验区：管理时间窗切换，并承载四类趋势图 */}
          <section>
            <GlassCard
              title={t("section.performanceExperience")}
              action={
                // 时间窗切换器：仅管理 range 状态，不直接处理请求逻辑
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-1">
                  <button
                    onClick={() => setRange("24h")}
                    className={`rounded-lg px-3 py-1 text-[11px] font-bold shadow-sm transition-colors ${range === "24h" ? "bg-background text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t("range.last24h")}
                  </button>
                  <button
                    onClick={() => setRange("7d")}
                    className={`rounded-lg px-3 py-1 text-[11px] font-bold shadow-sm transition-colors ${range === "7d" ? "bg-background text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t("range.last7d")}
                  </button>
                </div>
              }
            >
              {loadError ? (
                <div className="text-sm text-rose-600">{loadError}</div>
              ) : (
                <div className="space-y-6">
                  {/* 子组件：RequestErrorChart
                      作用：展示请求量+错误率复合趋势
                      管理范围：只消费 requestErrorTrend + range */}
                  <div className="grid grid-cols-1 gap-6">
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
                      <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("section.requestsErrorRate")}</p>
                      <RequestErrorChart data={charts?.requestErrorTrend ?? []} range={range} />
                    </div>
                  </div>
                  {/* 子组件：PercentileTrendChart（请求延迟）
                      作用：展示请求延迟分位（p75/p95/p99）
                      管理范围：只消费 latencyPercentileTrend + 展示配置 */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
                      <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("section.latencyPercentile")}</p>
                      <PercentileTrendChart
                        data={charts?.latencyPercentileTrend ?? []}
                        metricLabel={t("charts.metricLatency")}
                        color="hsl(var(--chart-1))"
                        unit="ms"
                        range={range}
                      />
                    </div>
                    {/* 子组件：PercentileTrendChart（资源延迟）
                        作用：展示资源加载延迟分位（p75/p95）
                        管理范围：只消费 resourcePercentileTrend + 展示配置 */}
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
                      <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("section.resourceLatencyPercentile")}</p>
                      <PercentileTrendChart
                        data={charts?.resourcePercentileTrend ?? []}
                        metricLabel={t("charts.metricResource")}
                        color="hsl(var(--chart-3))"
                        unit="ms"
                        range={range}
                        percentileOptions={["p75", "p95"]}
                      />
                    </div>
                  </div>
                  {/* 子组件：FcpLcpTrendChart / ClsTrendChart
                      作用：展示核心体验指标分位趋势
                      管理范围：仅消费对应图表数据与时间窗 */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
                      <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("section.fcpLcpPercentile")}</p>
                      <FcpLcpTrendChart data={charts?.fcpLcpTrend ?? []} range={range} />
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
                      <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("section.clsPercentile")}</p>
                      <ClsTrendChart data={charts?.clsTrend ?? []} range={range} />
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </section>

          {/* 近期错误区：错误列表 + 点击查看详情 */}
          <section>
            <GlassCard title={t("section.recentErrors")} className="h-full">
              <div className="max-h-[380px] space-y-4 overflow-y-auto pr-1">
                {(overview?.recentErrors ?? []).map((err) => (
                  <div key={err.id} className="group relative rounded-2xl border border-border/60 bg-muted/25 p-4 pb-7 pr-28 transition-colors hover:border-rose-200/70 hover:bg-muted/45">
                    <button
                      type="button"
                      onClick={() => setSelectedError(err)}
                      className="absolute right-4 top-3 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-accent"
                    >
                      {t("action.viewDetails")}
                    </button>
                    <div className="mb-1">
                      <span className="flex items-center gap-1.5 text-rose-600 text-xs font-bold uppercase tracking-tight">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {err.type}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-xs font-medium text-foreground/80">{err.message}</p>
                    <span className="absolute bottom-3 right-4 text-right text-[10px] font-bold text-muted-foreground">{toLocalTime(err.timestamp, locale)}</span>
                  </div>
                ))}
                {!loading && (overview?.recentErrors.length ?? 0) === 0 && <div className="text-xs text-muted-foreground">{t("empty.noErrors")}</div>}
              </div>
            </GlassCard>
          </section>
        </div>

        {/* 右侧侧栏区：慢资源、慢请求、路由分布 */}
        <aside className="col-span-12 2xl:col-span-4 space-y-8">
          {/* 慢资源榜单：按耗时排序，支持路径悬浮复制 */}
          <GlassCard title={t("section.topSlowResources")} action={<Clock className="h-4 w-4 text-sky-400" />}>
            <div className="space-y-5">
              {slowResources.map((resource, i) => (
                <div key={`${resource.initiatorType}-${resource.name}-${i}`} className="space-y-2 group">
                  <div className="flex items-start justify-between gap-3 text-[11px] font-bold">
                    <div className="min-w-0 flex-1 text-muted-foreground transition-colors group-hover:text-foreground">
                      <HoverPathWithCopy
                        value={resource.name}
                        copied={copiedPath === resource.name}
                        onCopy={() => handleCopyPath(resource.name)}
                        copiedText={t("common.copied")}
                        copyHintText={t("common.clickToCopy")}
                      />
                    </div>
                    <span className="font-space text-foreground">{resource.avgDurationMs.toFixed(2)}ms</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getInitiatorTypeTagClass(resource.initiatorType)}`}>
                      {resource.initiatorType}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {resource.sampleCount} {t("common.samples")}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-out ${getLatencyBarColorClass(
                        maxSlowResourceDuration > 0 ? resource.avgDurationMs / maxSlowResourceDuration : 0,
                      )}`}
                      style={{ width: `${maxSlowResourceDuration > 0 ? (resource.avgDurationMs / maxSlowResourceDuration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {!loading && slowResources.length === 0 && <div className="text-xs text-muted-foreground">{t("empty.noSlowResources")}</div>}
            </div>
          </GlassCard>

          {/* 慢请求榜单：按耗时排序，支持路径悬浮复制 */}
          <GlassCard title={t("section.topSlowRequests")} action={<Clock className="h-4 w-4 text-rose-400" />}>
            <div className="space-y-5">
              {slowRequests.map((route, i) => (
                <div key={`${route.path}-${i}`} className="space-y-2 group">
                  <div className="flex items-start justify-between gap-3 text-[11px] font-bold">
                    <div className="min-w-0 flex-1 text-muted-foreground transition-colors group-hover:text-foreground">
                      <HoverPathWithCopy
                        value={route.path}
                        copied={copiedPath === route.path}
                        onCopy={() => handleCopyPath(route.path)}
                        copiedText={t("common.copied")}
                        copyHintText={t("common.clickToCopy")}
                      />
                    </div>
                    <span className="font-space text-foreground">{route.avgDurationMs.toFixed(2)}ms</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-out ${getLatencyBarColorClass(
                        maxSlowRequestDuration > 0 ? route.avgDurationMs / maxSlowRequestDuration : 0,
                      )}`}
                      style={{ width: `${maxSlowRequestDuration > 0 ? (route.avgDurationMs / maxSlowRequestDuration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {!loading && slowRequests.length === 0 && <div className="text-xs text-muted-foreground">{t("empty.noSlowRequests")}</div>}
            </div>
          </GlassCard>

          {/* 子组件：RouteDistributionPieChart
              作用：展示页面路由流量占比，支持扇区选中
              管理范围：仅消费 topPageRoutes */}
          <GlassCard title={t("section.topTrafficRoutes")} action={<Globe className="h-4 w-4 text-indigo-400" />}>
            {pageRoutes.length ? <RouteDistributionPieChart data={pageRoutes} /> : <div className="text-xs text-muted-foreground">{t("empty.noRouteTrafficData")}</div>}
          </GlassCard>
        </aside>
      </main>

      {/* 错误详情弹窗：展示选中错误的结构化字段（type/time/file/message/stack） */}
      <Dialog open={Boolean(selectedError)} onOpenChange={(open) => !open && setSelectedError(null)}>
        <DialogContent className="max-w-2xl border-border bg-card text-card-foreground sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">{t("dialog.errorDetails")}</DialogTitle>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-3 text-xs text-foreground/90">
              <div>
                <span className="mr-2 font-semibold text-muted-foreground">{t("dialog.type")}:</span>
                <span>{selectedError.type}</span>
              </div>
              <div>
                <span className="mr-2 font-semibold text-muted-foreground">{t("dialog.time")}:</span>
                <span>{toLocalTime(selectedError.timestamp, locale)}</span>
              </div>
              <div>
                <span className="mr-2 font-semibold text-muted-foreground">{t("dialog.filename")}:</span>
                <span className="break-all">{selectedError.filename || "-"}</span>
              </div>
              <div>
                <span className="mr-2 font-semibold text-muted-foreground">{t("dialog.lineCol")}:</span>
                <span>
                  {selectedError.lineno ?? "-"} / {selectedError.colno ?? "-"}
                </span>
              </div>
              <div>
                <p className="mb-1 font-semibold text-muted-foreground">{t("dialog.message")}:</p>
                <p className="break-all rounded-lg border border-border bg-muted/40 p-2">{selectedError.message}</p>
              </div>
              <div>
                <p className="mb-1 font-semibold text-muted-foreground">{t("dialog.stack")}:</p>
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-muted/40 p-2">{selectedError.stack || "-"}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 页脚信息区：环境区域与版本信息 */}
      <footer className="mt-8 flex h-12 items-center justify-between border-t border-border/70 px-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            {t("footer.region")}: {t("footer.regionValue")}
          </span>
          <span className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-muted-foreground" /> {t("footer.version")}: 3.1.2-alpha
          </span>
        </div>
        <span className="normal-case font-medium tracking-normal opacity-60">&copy; 2025 FE Platform</span>
      </footer>
    </div>
  );
};

export default DashboardPage;
