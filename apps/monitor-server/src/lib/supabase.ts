import { createClient } from "@supabase/supabase-js";
import fetch, { Headers, Request, Response } from "cross-fetch";
import { env } from "../config/env";

/**
 * 兼容低版本 Node：补齐 fetch/Headers/Request/Response 全局对象。
 */
const ensureFetchGlobals = (): void => {
  if (!globalThis.fetch) globalThis.fetch = fetch as typeof globalThis.fetch;
  if (!globalThis.Headers) globalThis.Headers = Headers as typeof globalThis.Headers;
  if (!globalThis.Request) globalThis.Request = Request as typeof globalThis.Request;
  if (!globalThis.Response) globalThis.Response = Response as typeof globalThis.Response;
};

/**
 * Supabase 客户端单例，避免重复创建连接配置。
 */
let supabase: ReturnType<typeof createClient<any>> | null = null;

export const useSupabase = () => {
  if (!supabase) {
    ensureFetchGlobals();
    supabase = createClient<any>(env.supabaseUrl, env.supabaseServiceKey, {
      global: {
        fetch,
      },
    });
  }
  return supabase;
};
