import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Sector,
} from "recharts";
import type {
  ChartData,
  CoreWebVitalPercentileKey,
  PercentileKey,
  PercentileTrendData,
  RequestErrorTrendData,
  FcpLcpTrendData,
  ClsTrendData,
  RouteMetric,
} from "../types";
import { useI18n } from "@/i18n";

type TimeRange = "24h" | "7d";

const tooltipContentStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--popover) / 0.96)",
  borderRadius: "12px",
  border: "1px solid hsl(var(--border))",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.18)",
  color: "hsl(var(--popover-foreground))",
};

const tooltipLabelStyle: React.CSSProperties = {
  color: "hsl(var(--popover-foreground))",
};

const tooltipItemStyle: React.CSSProperties = {
  color: "hsl(var(--popover-foreground))",
};

const CHART_THEME = {
  grid: "hsl(var(--border) / 0.45)",
  tick: "hsl(var(--muted-foreground))",
  cursor: "hsl(var(--foreground) / 0.12)",
  series1: "hsl(var(--chart-1))",
  series2: "hsl(var(--chart-2))",
  series3: "hsl(var(--chart-3))",
  series4: "hsl(var(--chart-4))",
  series5: "hsl(var(--chart-5))",
  destructive: "hsl(var(--chart-5))",
};

const parseWindowDate = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatWindowForAxis = (value: string, range: TimeRange): string => {
  const date = parseWindowDate(value);
  if (!date) return value;
  if (range === "24h") return `${pad2(date.getHours())}:00`;
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const formatWindowForTooltip = (value: string, range: TimeRange): string => {
  const date = parseWindowDate(value);
  if (!date) return value;
  const md = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  if (range === "24h") return `${md} ${pad2(date.getHours())}:00`;
  return md;
};

const getAdaptiveXAxisInterval = (range: TimeRange, pointCount: number): number => {
  if (pointCount <= 2) return 0;
  if (range === "7d") {
    if (pointCount <= 14) return 0;
    const step = pointCount >= 24 ? 24 : Math.max(1, Math.ceil(pointCount / 7));
    return Math.max(0, step - 1);
  }
  const targetTickCount = 8;
  return Math.max(0, Math.ceil(pointCount / targetTickCount) - 1);
};

interface TrendChartProps {
  data: ChartData[];
  type: "performance" | "error";
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, type }) => {
  const gradientId = `gradient-${type}`;

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradient-performance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.85} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="gradient-error" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.88} />
              <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity={0.76} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: CHART_THEME.tick }} interval={3} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: CHART_THEME.tick }} />

          <Tooltip
            cursor={{ fill: CHART_THEME.cursor }}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />

          <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[4, 4, 0, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface PercentileTrendChartProps {
  data: PercentileTrendData[];
  metricLabel: string;
  color: string;
  unit?: "s" | "ms";
  range: TimeRange;
  percentileOptions?: PercentileKey[];
}

const defaultPercentileOptions: PercentileKey[] = ["p75", "p95", "p99"];

export const PercentileTrendChart: React.FC<PercentileTrendChartProps> = ({
  data,
  metricLabel,
  color,
  unit = "s",
  range,
  percentileOptions,
}) => {
  const { t } = useI18n();
  const [activePercentile, setActivePercentile] = useState<PercentileKey>("p75");
  const options = percentileOptions?.length ? percentileOptions : defaultPercentileOptions;
  const currentPercentile = options.includes(activePercentile) ? activePercentile : options[0];
  const xAxisInterval = getAdaptiveXAxisInterval(range, data.length);
  const latestPoint = data[data.length - 1];
  const latestValue = latestPoint?.[currentPercentile];
  const formatValue = (value: number) => `${unit === "ms" ? value.toFixed(0) : value.toFixed(2)}${unit}`;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
          <span className="uppercase tracking-wider">{metricLabel}</span>
          <span className="text-border">|</span>
          <span>{t("common.timeWindow")}</span>
          {typeof latestValue === "number" && (
            <>
              <span className="text-border">|</span>
              <span className="text-foreground">
                {currentPercentile.toUpperCase()} {formatValue(latestValue)}
              </span>
            </>
          )}
        </div>

        {options.length > 1 && (
          <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-muted/45 p-1">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActivePercentile(option)}
                className={`rounded-lg border border-transparent px-2.5 py-1 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 ${
                  currentPercentile === option
                    ? "border-border/70 bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-[185px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 18, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
            <XAxis
              dataKey="timeWindow"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: CHART_THEME.tick }}
              interval={xAxisInterval}
              padding={{ left: 4, right: 16 }}
              tickFormatter={(value) => formatWindowForAxis(String(value), range)}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: CHART_THEME.tick }} tickFormatter={(value) => `${value}${unit}`} />
            <Tooltip
              cursor={{ stroke: CHART_THEME.cursor, strokeWidth: 1 }}
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              labelFormatter={(label) => `${t("common.window")} ${formatWindowForTooltip(String(label), range)}`}
              formatter={(value) => {
                const numericValue = typeof value === "number" ? value : Number(value);
                if (!Number.isFinite(numericValue)) return ["-", `${metricLabel} ${currentPercentile.toUpperCase()}`];
                return [formatValue(numericValue), `${metricLabel} ${currentPercentile.toUpperCase()}`];
              }}
            />
            <Line type="monotone" dataKey={currentPercentile} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface RequestErrorChartProps {
  data: RequestErrorTrendData[];
  range: TimeRange;
}

export const RequestErrorChart: React.FC<RequestErrorChartProps> = ({ data, range }) => {
  const { t } = useI18n();
  const formatRequests = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`);
  const xAxisInterval = getAdaptiveXAxisInterval(range, data.length);

  return (
    <div className="h-[205px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 2, right: 18, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
          <XAxis
            dataKey="timeWindow"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: CHART_THEME.tick }}
            interval={xAxisInterval}
            padding={{ left: 4, right: 16 }}
            tickFormatter={(value) => formatWindowForAxis(String(value), range)}
          />

          <YAxis yAxisId="request" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: CHART_THEME.tick }} tickFormatter={formatRequests} />
          <YAxis
            yAxisId="errorRate"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: CHART_THEME.tick }}
            tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
          />

          <Tooltip
            cursor={{ stroke: CHART_THEME.cursor, strokeWidth: 1 }}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            labelFormatter={(label) => `${t("common.window")} ${formatWindowForTooltip(String(label), range)}`}
            formatter={(value, name) => {
              const numericValue = typeof value === "number" ? value : Number(value);
              if (!Number.isFinite(numericValue)) return ["-", String(name ?? "")];
              if (name === "errorRate") return [`${(numericValue * 100).toFixed(2)}%`, t("charts.errorRate")];
              return [formatRequests(numericValue), t("charts.requests")];
            }}
          />

          <Bar yAxisId="request" dataKey="requests" fill={CHART_THEME.series1} fillOpacity={0.28} radius={[5, 5, 0, 0]} barSize={10} />
          <Line yAxisId="errorRate" type="monotone" dataKey="errorRate" stroke={CHART_THEME.destructive} strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

interface FcpLcpTrendChartProps {
  data: FcpLcpTrendData[];
  range: TimeRange;
}

const cwvPercentileOptions: CoreWebVitalPercentileKey[] = ["p75", "p90"];

export const FcpLcpTrendChart: React.FC<FcpLcpTrendChartProps> = ({ data, range }) => {
  const { t } = useI18n();
  const [activePercentile, setActivePercentile] = useState<CoreWebVitalPercentileKey>("p75");
  const currentPercentile = cwvPercentileOptions.includes(activePercentile) ? activePercentile : "p75";
  const xAxisInterval = getAdaptiveXAxisInterval(range, data.length);
  const fcpKey = currentPercentile === "p90" ? "fcpP90" : "fcpP75";
  const lcpKey = currentPercentile === "p90" ? "lcpP90" : "lcpP75";

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("charts.fcpLcpPercentiles")}</div>
        <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-muted/45 p-1">
          {cwvPercentileOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setActivePercentile(option)}
              className={`rounded-lg border border-transparent px-2.5 py-1 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 ${
                currentPercentile === option
                  ? "border-border/70 bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[185px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 18, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
            <XAxis
              dataKey="timeWindow"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: CHART_THEME.tick }}
              interval={xAxisInterval}
              padding={{ left: 4, right: 16 }}
              tickFormatter={(value) => formatWindowForAxis(String(value), range)}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: CHART_THEME.tick }} tickFormatter={(value) => `${value}s`} />
            <Tooltip
              cursor={{ stroke: CHART_THEME.cursor, strokeWidth: 1 }}
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              labelFormatter={(label) => `${t("common.window")} ${formatWindowForTooltip(String(label), range)}`}
              formatter={(value, name) => {
                const numericValue = typeof value === "number" ? value : Number(value);
                if (!Number.isFinite(numericValue)) return ["-", String(name ?? "")];
                const metric = String(name).startsWith("fcp") ? "FCP" : "LCP";
                return [`${numericValue.toFixed(2)}s`, `${metric} ${currentPercentile.toUpperCase()}`];
              }}
            />
            <Line type="monotone" dataKey={fcpKey} stroke={CHART_THEME.series2} strokeWidth={2.4} dot={false} />
            <Line type="monotone" dataKey={lcpKey} stroke={CHART_THEME.series1} strokeWidth={2.4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface ClsTrendChartProps {
  data: ClsTrendData[];
  range: TimeRange;
}

export const ClsTrendChart: React.FC<ClsTrendChartProps> = ({ data, range }) => {
  const { t } = useI18n();
  const currentPercentile: CoreWebVitalPercentileKey = "p75";
  const xAxisInterval = getAdaptiveXAxisInterval(range, data.length);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("charts.clsPercentile")}</div>
        <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-muted/45 p-1">
          <button
            type="button"
            className="rounded-lg border border-border/70 bg-background px-2.5 py-1 text-[10px] font-bold text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0"
          >
            P75
          </button>
        </div>
      </div>
      <div className="h-[185px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 18, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
            <XAxis
              dataKey="timeWindow"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: CHART_THEME.tick }}
              interval={xAxisInterval}
              padding={{ left: 4, right: 16 }}
              tickFormatter={(value) => formatWindowForAxis(String(value), range)}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: CHART_THEME.tick }} />
            <Tooltip
              cursor={{ stroke: CHART_THEME.cursor, strokeWidth: 1 }}
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              labelFormatter={(label) => `${t("common.window")} ${formatWindowForTooltip(String(label), range)}`}
              formatter={(value) => {
                const numericValue = typeof value === "number" ? value : Number(value);
                if (!Number.isFinite(numericValue)) return ["-", `CLS ${currentPercentile.toUpperCase()}`];
                return [numericValue.toFixed(4), `CLS ${currentPercentile.toUpperCase()}`];
              }}
            />
            <Line type="monotone" dataKey="clsP75" stroke={CHART_THEME.series4} strokeWidth={2.4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface RouteDistributionPieChartProps {
  data: RouteMetric[];
}

const ROUTE_PIE_COLORS = [
  "hsl(var(--pie-1))",
  "hsl(var(--pie-2))",
  "hsl(var(--pie-3))",
  "hsl(var(--pie-4))",
  "hsl(var(--pie-5))",
  "hsl(var(--pie-6))",
  "hsl(var(--pie-7))",
  "hsl(var(--pie-8))",
];

export const RouteDistributionPieChart: React.FC<RouteDistributionPieChartProps> = ({ data }) => {
  const { t } = useI18n();
  const routePieColors = ROUTE_PIE_COLORS;

  const displayData = data
    .filter((item) => Number.isFinite(item.percentage) && item.percentage > 0)
    .map((item, index) => ({
      ...item,
      color: routePieColors[index % routePieColors.length],
    }));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const hasSelection = selectedIndex !== null && selectedIndex >= 0 && selectedIndex < displayData.length;
  const safeSelectedIndex = hasSelection ? selectedIndex : 0;
  const selectedRoute = hasSelection ? displayData[safeSelectedIndex] : undefined;

  useEffect(() => {
    setSelectedIndex(null);
  }, [displayData.length]);

  return (
    <div className="w-full space-y-3">
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              dataKey="percentage"
              nameKey="path"
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={82}
              paddingAngle={0}
              stroke="none"
              onClick={(_, index) => {
                if (typeof index !== "number") return;
                setSelectedIndex((prev) => (prev === index ? null : index));
              }}
              shape={(props, index) => (
                <Sector
                  {...props}
                  fill={(props.payload as { color?: string }).color ?? routePieColors[index % routePieColors.length]}
                  fillOpacity={hasSelection && displayData.length > 1 && safeSelectedIndex !== index ? 0.55 : 1}
                  stroke="none"
                  style={{ cursor: "pointer" }}
                />
              )}
            />
            <Tooltip
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              formatter={(value) => {
                const numericValue = typeof value === "number" ? value : Number(value);
                if (!Number.isFinite(numericValue)) return "-";
                return `${numericValue.toFixed(2)}%`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {selectedRoute ? (
        <div className="space-y-1 rounded-xl border border-border bg-card/70 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("charts.selectedRoute")}</p>
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedRoute.color }}
            />
            <span className="truncate text-[11px] font-semibold text-foreground">{selectedRoute.path}</span>
          </div>
          <p className="text-sm font-bold text-foreground">{selectedRoute.percentage.toFixed(2)}%</p>
          <p className="text-[10px] text-muted-foreground">{t("charts.routeHintUnselect")}</p>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          {displayData.length ? t("charts.routeHintInspect") : t("charts.routeNoData")}
        </div>
      )}
    </div>
  );
};
