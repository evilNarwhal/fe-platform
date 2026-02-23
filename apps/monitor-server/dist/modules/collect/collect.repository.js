import { useSupabase } from "../../lib/supabase";
const EVENT_TABLE = "monitor_events";
const ERROR_TABLE = "monitor_errors";
/**
 * 事件数据入库，保留 app/env/release/user 等维度用于筛选与统计。
 */
export const insertEvent = async (payload) => {
    const client = useSupabase();
    const { error } = await client.from(EVENT_TABLE).insert({
        app_id: payload.appId ?? null,
        env: payload.env ?? null,
        release: payload.release ?? null,
        user_id: payload.userId ?? null,
        event_name: payload.data.name,
        props: payload.data.props ?? {},
        occurred_at: new Date(payload.timestamp).toISOString(),
        received_at: new Date().toISOString(),
        raw: payload,
    });
    if (error)
        throw error;
};
/**
 * 错误数据入库，拆出 stack/定位字段便于排查与聚合。
 */
export const insertError = async (payload) => {
    const client = useSupabase();
    const { error } = await client.from(ERROR_TABLE).insert({
        app_id: payload.appId ?? null,
        env: payload.env ?? null,
        release: payload.release ?? null,
        user_id: payload.userId ?? null,
        message: payload.data.message,
        stack: payload.data.stack ?? null,
        error_type: payload.data.type ?? null,
        filename: payload.data.filename ?? null,
        lineno: payload.data.lineno ?? null,
        colno: payload.data.colno ?? null,
        occurred_at: new Date(payload.timestamp).toISOString(),
        received_at: new Date().toISOString(),
        raw: payload,
    });
    if (error)
        throw error;
};
//# sourceMappingURL=collect.repository.js.map