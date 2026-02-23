// 统一导出对外 API
export { init, trackEvent,trackError,register } from "./sdk/core";


// 导出调用者可能用到的类型
export type {
  MonitorLevel,
  MonitorEvent,
  MonitorError,
  MonitorOptions,
} from "./types"






