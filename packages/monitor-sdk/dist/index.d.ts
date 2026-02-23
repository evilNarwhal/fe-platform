type MonitorLevel = "info" | "warn" | "error";
interface MonitorOptions {
    endpoint?: string;
    appId?: string;
    env?: 'dev' | 'test' | 'prod';
    release?: string;
    userId?: string;
    exclude?: RegisterKey[];
    debug?: boolean;
    headers?: Record<string, string>;
    withCredentials?: boolean;
    autoTrack?: boolean;
    sampleRate?: number;
}
interface MonitorEvent {
    name: string;
    props?: Record<string, unknown>;
}
interface MonitorError {
    message: string;
    stack?: string;
    type?: string;
    filename?: string;
    lineno?: number;
    colno?: number;
}
type Cleanup = (() => void) | undefined;
type RegisterKey = "error" | "performance" | "fetch" | "pageview" | "axios";
type RegisterMode = 'replace' | 'skip' | 'preload';

declare const trackEvent: (event: MonitorEvent) => void;
declare const trackError: (error: MonitorError) => void;
declare const init: (options?: MonitorOptions) => Required<Pick<MonitorOptions, "endpoint" | "appId" | "env" | "release" | "userId" | "exclude" | "debug" | "headers" | "autoTrack" | "sampleRate" | "withCredentials">> | null;
/**
 * 安全注册包装器 API
 * - skip: 已注册则直接复用已有 cleanup
 * - replace: 先清理旧注册，再执行新注册
 * - 统一兜底异常，避免注册失败影响业务流程
 */
declare const register: (key: RegisterKey, mode?: RegisterMode, ...args: any[]) => Cleanup;

export { type MonitorError, type MonitorEvent, type MonitorLevel, type MonitorOptions, init, register, trackError, trackEvent };
