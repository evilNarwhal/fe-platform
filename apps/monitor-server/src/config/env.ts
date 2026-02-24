import dotenv from "dotenv";

/**
 * 使用 dotenv 兼容低版本 Node 环境。
 */
dotenv.config();

const parseCsv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * 统一读取运行时环境变量。
 */
export const env = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey:
    process.env.SUPABASE_SERVICE_KEY ?? process.env.SURVICE_KEY ?? "",
  dashboardUseMock: process.env.DASHBOARD_USE_MOCK === "true",
  collectCorsAllowedOrigins: parseCsv(
    process.env.CORS_COLLECT_ALLOWED_ORIGINS ??
      process.env.CORS_ALLOWED_ORIGINS ??
      process.env.CORS_ORIGIN
  ),
  dashboardCorsAllowedOrigins: parseCsv(
    process.env.CORS_DASHBOARD_ALLOWED_ORIGINS ??
      process.env.CORS_ALLOWED_ORIGINS ??
      process.env.CORS_ORIGIN
  ),
  collectCorsAllowCredentials:
    (process.env.CORS_COLLECT_ALLOW_CREDENTIALS ??
      process.env.CORS_ALLOW_CREDENTIALS) === "true",
  dashboardCorsAllowCredentials:
    (process.env.CORS_DASHBOARD_ALLOW_CREDENTIALS ??
      process.env.CORS_ALLOW_CREDENTIALS) === "true",
};

interface AssertEnvOptions {
  requireSupabase?: boolean;
}

/**
 * 启动时校验关键配置。
 * - mock 模式下可跳过 Supabase 强校验。
 */
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

