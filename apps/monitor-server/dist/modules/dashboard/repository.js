import { useSupabase } from "../../lib/supabase";
/**
 * 查询 monitor_events 明细数据。
 *
 * 设计说明：
 * - 这里只做“数据拉取与基础过滤”，不做业务聚合。
 * - service 层会基于这些明细统一计算分位数、错误率、趋势等指标。
 * - limit 先设置为 20000，避免单次拉取过大导致接口过慢。
 */
export const fetchEventRows = async (query) => {
    const client = useSupabase();
    let req = client
        .from("monitor_events")
        .select("occurred_at,event_name,props,app_id,env")
        .gte("occurred_at", query.from.toISOString())
        .lte("occurred_at", query.to.toISOString())
        .order("occurred_at", { ascending: true })
        .limit(20000);
    if (query.appId)
        req = req.eq("app_id", query.appId);
    if (query.env)
        req = req.eq("env", query.env);
    const { data, error } = await req;
    if (error)
        throw error;
    return (data ?? []);
};
/**
 * 查询 monitor_errors 近期错误记录。
 *
 * 设计说明：
 * - 按 occurred_at 倒序，确保前端优先拿到最新异常。
 * - limit 由上层控制，防止全量扫描。
 */
export const fetchRecentErrors = async (query, limit) => {
    const client = useSupabase();
    let req = client
        .from("monitor_errors")
        .select("id,occurred_at,message,error_type,filename,lineno,colno,stack,app_id,env")
        .gte("occurred_at", query.from.toISOString())
        .lte("occurred_at", query.to.toISOString())
        .order("occurred_at", { ascending: false })
        .limit(limit);
    if (query.appId)
        req = req.eq("app_id", query.appId);
    if (query.env)
        req = req.eq("env", query.env);
    const { data, error } = await req;
    if (error)
        throw error;
    return (data ?? []);
};
//# sourceMappingURL=repository.js.map