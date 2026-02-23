import { trackError } from "./core";

// 需要关注的资源标签，资源加载失败时用于过滤目标元素
const RESOURCE_TAGS = new Set(["IMG", "SCRIPT", "LINK", "AUDIO", "VIDEO"]);

// 从不同类型资源元素上提取可定位的资源 URL
const getResourceUrl = (target: HTMLElement): string => {
  if (target instanceof HTMLScriptElement) return target.src;
  if (target instanceof HTMLLinkElement) return target.href;
  if (target instanceof HTMLImageElement) return target.currentSrc || target.src;
  if (target instanceof HTMLAudioElement || target instanceof HTMLVideoElement) return target.currentSrc || target.src;
  return "";
};

// 注册全局错误监听
export const registerErrorHandlers = () => {
  // 1) JS 运行时错误：语法/执行异常等会进入该回调
  const onRuntimeError = (event: ErrorEvent) => {
    trackError({
      message: event.message,
      stack: event.error?.stack,
      type: "runtime",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };
  window.addEventListener("error", onRuntimeError);

  // 2) Promise 未处理拒绝：例如 async 流程缺少 catch
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason =
      typeof event.reason === "string" ? event.reason : JSON.stringify(event.reason);
    trackError({
      message: `未处理的Promise异常: ${reason}`,
      type: "promise"
    });
  };
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  // 3) 资源加载失败：error 事件不会冒泡，必须用捕获阶段监听
  const onResourceError = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!RESOURCE_TAGS.has(target.tagName)) return;
    const url = getResourceUrl(target);
    if (!url) return;
    trackError({
      message: `资源加载失败: ${target.tagName} 页面：${window.location.href || '未知'} `,
      filename: url,
      type: "resource",
    });
  };
  window.addEventListener("error", onResourceError, true);

  // 监听@font-face(内部css)发起的请求
  const onFontError = (event: FontFaceSetLoadEvent) => {
    trackError({
      type: "resource",
      message: `字体加载失败 页面: ${location.href}`,
      filename: event.fontfaces.join(' and '),
    });
  }
  document.fonts?.addEventListener?.('loadingerror', onFontError);

  // 统一注销，避免重复注册导致的重复上报
  return () => {
    window.removeEventListener("error", onRuntimeError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    window.removeEventListener("error", onResourceError, true);
    document.fonts?.removeEventListener?.('loadingerror',onFontError)
  };

};
