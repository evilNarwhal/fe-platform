import { trackEvent } from "./core"

// 页面访问情况上报
export const trackPageView = (url?: string) => {
  trackEvent({
    name: 'page-view',
    props: {
      // 当前页面 URL
      url: url ?? location.href,
      // 当前页面的来源页面地址，例如搜索结果页；直接输入地址跳转时通常为空字符串
      referrer: document.referrer
    },
  })
}

// 页面访问处理（支持原生 + SPA）内部方法，通过 init 执行
export const registerPageView = () => {
  trackPageView();// 首次进入时立刻触发一次
  // 监听浏览器前进后退事件
  const onPopState = ()=>trackPageView();
  window.addEventListener("popstate", onPopState);
  // 监听 SPA 场景下的 pushState（新增）和 replaceState（替换）
  // 通过 wrap 包装可同时处理两种函数并保留原有签名
  const wrap = <TFunc extends (...args: any[]) => any>(fn: TFunc) => {
    return function (this: unknown, ...args: Parameters<TFunc>) {
      const result = fn.apply(this, args);
      trackPageView();
      return result;
    }
  }
  const oriPushState = history.pushState;
  const oriReplaceState = history.replaceState;
  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);
  // 注销
  return ()=>{
    window.removeEventListener("popstate",onPopState)
    history.pushState=oriPushState;
    history.replaceState=oriReplaceState;
  }
}
