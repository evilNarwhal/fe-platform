// i18n 模块统一出口：
// 业务代码从 "@/i18n" 引入，避免感知内部文件结构
export { I18nProvider, useI18n } from "./context";
export type { Locale, MessageKey } from "./messages";
