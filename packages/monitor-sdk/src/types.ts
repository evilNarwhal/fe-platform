// 监控日志等级
export type MonitorLevel = "info" | "warn" | "error"

// SDK初始化参数
export interface MonitorOptions {
  // 仪表盘地址
  endpoint?: string,
  // 应用标识（区分不同业务）
  appId?: string,
  // 环境标识（dev//test/prod）
  env?: 'dev'|'test'|'prod'
  // 应用版本号
  release?: string,
  // 用户id
  userId?: string,
  // 无需自动注册的类型
  exclude?: RegisterKey[]
  // 调试日志
  debug?: boolean,
  // 应用通信给sdk时添加的额外请求头
  headers?: Record<string, string>,
  // 是否携带cookie
  withCredentials?: boolean,
  // 是否开启自动注册
  autoTrack?: boolean,
  // 采样率(0-1)
  sampleRate?: number
}

// 业务事件类型
export interface MonitorEvent {
  // 事件名称
  name: string,
  props?: Record<string, unknown>
}

// 错误数据类型
export interface MonitorError {
  // 错误信息
  message: string;
  // 堆栈信息
  stack?: string;
  // 错误类型
  type?: string;
  // 文件名
  filename?: string;
  // 代码行
  lineno?: number;
  // 代码列
  colno?: number;
}

// 内部配置，内部使用时定义为必需字段，也能保留外部可选
export type InternalConfig = Required<
    Pick<
        MonitorOptions,
        'endpoint'|'appId'|'env'|'release'|'userId'|'exclude'|'debug'|'headers'|'autoTrack'|'sampleRate'|'withCredentials'
    >
>

// 通信函数的负载对象类型
export interface SendPayload{
  type:'event'|'error'
  timestamp:number,
  data: MonitorError|MonitorEvent,
  appId?:string,
  env?:'dev'|'test'|'prod',
  release?:string,
  userId?:string
}

// CLS相关类
export interface LayoutShift extends PerformanceEntry{
    value:number,
    hadRecentInput:boolean
}

// 清理函数类型
export type Cleanup = (() => void)|undefined;

export type RegisterCallback = (...args:any[])=>Cleanup

export type RegisterKey = "error" | "performance" | "fetch" | "pageview"|"axios"

export type RegisterState = {
  registered: boolean,
  registerCallback: RegisterCallback | undefined,
  cleanup:Cleanup
}

export type RegisterMode = 'replace' | 'skip' | 'preload'

export type PendingRegisterTask = { mode: RegisterMode; args: any[] }
