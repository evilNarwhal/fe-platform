import type { DashboardQuery, MonitorErrorRow, MonitorEventRow } from "./types";
/**
 * 查询 monitor_events 明细数据。
 *
 * 设计说明：
 * - 这里只做“数据拉取与基础过滤”，不做业务聚合。
 * - service 层会基于这些明细统一计算分位数、错误率、趋势等指标。
 * - limit 先设置为 20000，避免单次拉取过大导致接口过慢。
 */
export declare const fetchEventRows: (query: DashboardQuery) => Promise<MonitorEventRow[]>;
/**
 * 查询 monitor_errors 近期错误记录。
 *
 * 设计说明：
 * - 按 occurred_at 倒序，确保前端优先拿到最新异常。
 * - limit 由上层控制，防止全量扫描。
 */
export declare const fetchRecentErrors: (query: DashboardQuery, limit: number) => Promise<MonitorErrorRow[]>;
//# sourceMappingURL=repository.d.ts.map