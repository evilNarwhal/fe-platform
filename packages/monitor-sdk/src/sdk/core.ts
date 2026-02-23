import type { MonitorOptions, MonitorEvent, MonitorError, InternalConfig, SendPayload, RegisterCallback, Cleanup, RegisterKey, RegisterState ,RegisterMode,PendingRegisterTask} from "../types"
import { registerErrorHandlers } from "./error"
import { registerPageView } from "./pageview"
import { registerPerformance } from "./performance"
import { registerFetch } from "./request"
import { registerAxios } from "./request"

// 外部未传入时使用的默认内部配置
const defaultConfig: InternalConfig = {
  endpoint: '',
  appId: '',
  env: 'dev',
  release: '',
  userId: '',
  exclude: ['axios'],
  debug: true,
  headers: {},
  withCredentials: false,
  autoTrack: true,
  sampleRate: 1
}
// 实际运行时配置，init 后完成合并并初始化
let currentConfig: InternalConfig | null = null;
// 是否进行了初始化
let initialed = false;
// 保持原有 fetch 引用
let oriFetch: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | null = null;
// 建立key=>监听器的映射，用于获取对应callback
const registerCallbacks = new Map<RegisterKey, RegisterCallback>([
  ["error", registerErrorHandlers],
  ["fetch", registerFetch],
  ["pageview", registerPageView],
  ["performance", registerPerformance],
  ["axios", registerAxios],
])

// 用Map统一管理各监听器状态，避免重复注册/清理
const registerStates = new Map<RegisterKey, RegisterState>()
// 缓存初始化前就注册的监听器
const pendingRegisterTaskMap = new Map<RegisterKey, PendingRegisterTask>()

// 获取最终配置函数（内部方法）
const getConfig = () => currentConfig ?? defaultConfig;

// 获取基础发送负载（内部方法）
const getBasePayload = () => {
  const { appId, env, release, userId } = getConfig();
  const basePayload = {
    appId,
    env,
    release,
    userId
  }
  return basePayload;
}

// 向服务端发送监控数据
const send = (payload: SendPayload) => {
  const { endpoint, headers, withCredentials } = getConfig();
  if (!endpoint)
    return;
  debugLog('发送数据：',payload)
  // 使用 fetch 发送
  if (!oriFetch)
    throw new TypeError("fetch方法不存在")
  oriFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(payload),
    credentials: withCredentials ? "include" : "omit",
    keepalive: true
  }).catch((error) => {
    debugLog('发送失败：',error)
  })
}

// 业务事件上报 API/内部方法
export const trackEvent = (event: MonitorEvent): void => {
  if (!event)
    return;
  const basePayload = getBasePayload();
  const payload: SendPayload = {
    type: 'event',
    timestamp: Date.now(),
    data: event,
    ...basePayload
  }
  send(payload)
}

// 业务错误上报 API/内部方法
export const trackError = (error: MonitorError): void => {
  if (!error)
    return;
  const basePayload = getBasePayload();
  const payload: SendPayload = {
    type: 'error',
    timestamp: Date.now(),
    data: error,
    ...basePayload
  }
  send(payload);
}

// 统一debug打印
export const debugLog = (...data: any) => {
  if (getConfig().debug) {
    // eslint-disable-next-line no-console
    console.log(`monitor-sdk DEBUG INFO`, ...data)
  }
}

// 初始化函数 API
export const init = (options: MonitorOptions = {}) => {
  try {
    if (initialed) {
      debugLog('已初始化，跳过初始化流程')
      return currentConfig;
    }
    if (typeof window === "undefined" || !window) {
      throw new TypeError(`window对象未定义或不可用`)
    }
    oriFetch = window.fetch;
    // 合并默认配置和用户自定义配置
    currentConfig = {
      ...defaultConfig,
      ...options,
      // 引用类型需要深合并，避免覆盖
      headers: { ...defaultConfig.headers, ...(options.headers ?? {}) },
      exclude: [...defaultConfig.exclude, ...(options.exclude ?? [])]
    };
    // 如果开启 debug，打印当前配置
    debugLog('初始化配置：', currentConfig)
    // 维护所有监听器（保留 preload 阶段已完成的注册状态）
    Array.from(registerCallbacks.entries()).forEach(([key, callback]) => {
      const state = registerStates.get(key)
      if (!state) {
        initRegisterState(key, callback)
        return
      }
    })
    initialed = true;
    if (currentConfig.autoTrack) {
      // 过滤不需要的监听器后逐个进行注册
      Array.from(registerStates.keys())
        .filter((key) => !getConfig().exclude.includes(key))
        .forEach((key) => register(key))
    }
    // 注册缓存的监听器
    flushPendingRegisters();
    return currentConfig;
  } catch (err) {
    debugLog(`init初始化异常：${err}`)
    // 继续抛出，让调用方感知到
    throw (err);
  }

}

/**
 * 安全注册包装器 API
 * - skip: 已注册则直接复用已有 cleanup
 * - replace: 先清理旧注册，再执行新注册
 * - 统一兜底异常，避免注册失败影响业务流程
 */
export const register = (
  key: RegisterKey,
  mode: RegisterMode = 'skip',
  ...args: any[]
): Cleanup => {
  // 未初始化则先记录到待执行Map集合中
  if (!initialed) {
    // 对于需要预加载的监听器，提前初始化并注册
    if(mode==='preload'){
      debugLog(`提前初始化并注册监听器 ${key} `)
      getRegisterState(key)
      updateRegisterState(key,...args)
      return;
    }
    // 记录初始化前尝试注册的监听器
    pendingRegisterTaskMap.set(key, { mode:"replace", args })
    debugLog(`监听器 ${key} 暂存，等待初始化完成后执行`)
    return;
  }
  const rs = getRegisterState(key)
  if (!rs)
    return;
  // 是否已注册 进行注册/跳过/替换
  const hasRegistered = rs.registered;
  if (!hasRegistered) {
    updateRegisterState(key, ...args);
    return safeCleanup(key);
  }
  // 跳过逻辑
  if (hasRegistered && mode === "skip") {
    debugLog(`已注册 ${key} ，执行跳过`)
    return safeCleanup(key);
  }
  // 替换逻辑
  if (hasRegistered && mode === "replace") {
    try {
      debugLog(`已注册 ${key} ，执行替换`)
      // 先获取安全清理函数
      const cleanup = safeCleanup(key);
      if (cleanup)
        cleanup();
      // 再进行注册
      updateRegisterState(key, ...args);
      // 最后返回新的清理函数
      return safeCleanup(key);
    } catch (error) {
      throw (`监听器 ${key} 替换失败：, ${error}`)
    }
  }
  return;
}

// 安全获取监听器状态
const getRegisterState = (key: RegisterKey): RegisterState | undefined => {
  // 获取并检查是否有该register，缺失时从回调Map进行初始化
  let rs = registerStates.get(key)
  if (!rs) {
    debugLog(`尝试注册监听器 ${key} `)
    const callback = getRegisterCallback(key)
    initRegisterState(key, callback)
    rs = registerStates.get(key)
  }
  if (!rs) throw new Error(`监听器 ${key} 不存在`)
  return rs;
}

// 获取监听器回调
const getRegisterCallback = (key: RegisterKey): RegisterCallback => {
  const callback = registerCallbacks.get(key)
  if (!callback) throw new Error(`未找到监听器 ${key} 的注册回调`)
  return callback
}

// 初始化监听器状态
const initRegisterState = (key: RegisterKey, callback: RegisterCallback) => {
  registerStates.set(key, { registered: false, registerCallback: callback, cleanup: undefined })
  debugLog(`监听器 ${key} 已初始化为待注册状态`)
}

// 注册监听器并更新状态
const updateRegisterState = (key: RegisterKey, ...args: any[]) => {
  try {
    const rs = getRegisterState(key);
    if (!rs?.registerCallback) {
      throw new Error(`执行失败，未找到监听器 ${key} `)
    }
    debugLog(`注册监听器 ${key} 并更新监听器状态`)
    rs.cleanup = rs.registerCallback(...args);
    rs.registered = true;
    registerStates.set(key, rs);
  } catch (err) {
    throw err;
  }

}

// 清理监听器状态，相当于初始化，不同的是map已经包含该监听器 尽量只依赖key，防止意外错误
const clearResisterState = (key: RegisterKey) => {
  const rs = getRegisterState(key);
  if (rs) {
    debugLog(`初始化监听器 ${key} 状态`)
    initRegisterState(key, getRegisterCallback(key))
  }
}

// 包装为安全的清理函数
const safeCleanup = (key: RegisterKey): Cleanup => {
  const rs = getRegisterState(key);
  // 返回一个安全清理函数
  return () => {
    if (!rs?.cleanup) {
      throw new Error(`监听器 ${key} 缺少对应的清理函数`)
    }
    if(rs.registered===false){
      debugLog(`监听器 ${key} 未注册，清理完毕`)
      return;
    }
    // 清理后执行初始化，保证状态一致
    debugLog(`正在清理监听器 ${key} `)
    rs.cleanup();
    clearResisterState(key);
  }
}

// 刷新缓存的监听器
const flushPendingRegisters = () => {
  if (!pendingRegisterTaskMap.size)
    return;
  const tasks = Array.from(pendingRegisterTaskMap.entries());
  pendingRegisterTaskMap.clear();
  tasks.forEach(([key, task]) => {
    register(key, task.mode, ...task.args);
  })
}
