/**
 * 缁熶竴璇诲彇杩愯鏃剁幆澧冨彉閲忋€? */
export declare const env: {
    port: number;
    supabaseUrl: string;
    supabaseServiceKey: string;
    dashboardUseMock: boolean;
};
interface AssertEnvOptions {
    requireSupabase?: boolean;
}
/**
 * 鍚姩鏃舵牎楠屽叧閿厤缃€? * - mock 妯″紡涓嬪彲璺宠繃 Supabase 寮烘牎楠屻€? */
export declare const assertEnv: (options?: AssertEnvOptions) => void;
export {};
//# sourceMappingURL=env.d.ts.map