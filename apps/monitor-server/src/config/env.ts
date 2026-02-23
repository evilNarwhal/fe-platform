import dotenv from "dotenv";

/**
 * 浣跨敤 dotenv 鍏煎浣庣増鏈?Node 鐜銆? */
dotenv.config();

/**
 * 缁熶竴璇诲彇杩愯鏃剁幆澧冨彉閲忋€? */
export const env = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey:
    process.env.SUPABASE_SERVICE_KEY ?? process.env.SURVICE_KEY ?? "",
  dashboardUseMock: process.env.DASHBOARD_USE_MOCK === "true",
};

interface AssertEnvOptions {
  requireSupabase?: boolean;
}

/**
 * 鍚姩鏃舵牎楠屽叧閿厤缃€? * - mock 妯″紡涓嬪彲璺宠繃 Supabase 寮烘牎楠屻€? */
export const assertEnv = (options: AssertEnvOptions = {}): void => {
  const { requireSupabase = true } = options;
  if (!requireSupabase) return;

  if (!env.supabaseUrl) {
    throw new Error("Missing required env: SUPABASE_URL");
  }
  if (!env.supabaseServiceKey) {
    throw new Error("Missing required env: SUPABASE_SERVICE_KEY (or SURVICE_KEY)");
  }
};

