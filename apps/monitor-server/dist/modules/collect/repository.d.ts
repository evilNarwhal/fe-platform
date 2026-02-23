import type { ErrorPayload, EventPayload } from "./types";
/**
 * 事件数据入库，保留 app/env/release/user 等维度用于筛选与统计。
 */
export declare const insertEvent: (payload: EventPayload) => Promise<void>;
/**
 * 错误数据入库，拆出 stack/定位字段便于排查与聚合。
 */
export declare const insertError: (payload: ErrorPayload) => Promise<void>;
//# sourceMappingURL=repository.d.ts.map