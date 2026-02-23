import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

import { messages, type Locale, type MessageKey } from "./messages";

// i18n 上下文对外暴露的能力：
// 1) 当前语言 locale
// 2) 切换语言 setLocale
// 3) 文案查询函数 t(key)
interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey) => string;
}

// localStorage 键名：用于持久化用户上次选择的语言
const I18N_STORAGE_KEY = "monitor-dashboard-locale";

// 读取初始语言：
// - SSR/无 window 时默认 en
// - 优先使用本地持久化值
// - 兜底 en
const getInitialLocale = (): Locale => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(I18N_STORAGE_KEY);
  if (stored === "en" || stored === "zh") return stored;
  return "en";
};

// 创建 i18n context，默认值为 null，强制通过 Provider 使用
const I18nContext = createContext<I18nContextValue | null>(null);

// i18n Provider：
// - 管理 locale 状态
// - 同步 localStorage 与 html lang 属性
// - 提供 t(key) 翻译能力（当前语言 -> 英文兜底 -> key）
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(I18N_STORAGE_KEY, locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      t: (key) => messages[locale][key] ?? messages.en[key] ?? key,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// 业务侧统一通过该 Hook 访问 i18n 能力
// 若未被 Provider 包裹，直接抛错提示接入问题
export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
};
