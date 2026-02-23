import { LayoutShift } from "../types";
import { debugLog, trackEvent } from "./core"

const MAX_RESOURCE_SAMPLES = 20;
const STATIC_RESOURCE_INITIATOR_TYPES = new Set(["script", "link", "css", "img", "font"]);

/**
 * 上报 Paint 指标（FP/FCP）。
 */
export const trackPaint = (fp: number | null, fcp: number | null) => {
  trackEvent(
    {
      name: "performance-paint",
      props: {
        paints: {
          fcp,
          fp
        }
      }
    },
  )
}

/**
 * 上报持续型性能指标（LCP/CLS）。
 */
export const trackLCPAndClS = (lcp: number | null, cls: number | null) => {
  trackEvent({
    name: "performance-listening",
    props: {
      lcp, // 单位：ms
      cls // 无单位
    }
  })
}

/**
 * 上报 Navigation Timing 核心字段。
 */
export const trackNavigation = () => {
  const navigation = performance?.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  trackEvent({
    name: "performance-navigation",
    props: {
      navigation: navigation ? {
        // 导航类型：navigate / reload / back_forward / prerender
        type: navigation.type,
        // 导航开始的时间点（相对页面开始，通常为 0）
        startTime: navigation.startTime,
        // DOMContentLoaded 事件结束时间
        domContentLoaded: navigation.domContentLoadedEventEnd,
        // load 事件结束时间（页面完全加载）
        loadEventEnd: navigation.loadEventEnd,
        // 首字节响应完成时间（TTFB 相关）
        responseEnd: navigation.responseEnd,
        // TCP/QUIC 连接建立完成时间
        connectEnd: navigation.connectEnd,
        // 浏览器开始发起请求的时间
        requestStart: navigation.requestStart,
      } : null,
    }
  })
}

/**
 * 上报资源加载耗时样本列表。
 */
export const trackResource = (
  resources: Array<{ name: string; initiatorType: string; duration: number }>,
) => {
  trackEvent({
    name: "performance-resource",
    props: {
      resources,
    }
  })
}

/**
 * 注册性能采集流程。
 * 包含：Paint/Navigation/Resource 即时上报，以及 LCP/CLS 持续监听上报。
 */
export const registerPerformance = () => {
  // 监控paint和resource等指标
  const pc = paintCollector();
  const rc = resourceCollector();
  pc.start();
  rc.start();
  /**
   * 页面 load 后延迟采集并上报瞬时性能指标。
   */
  const onLoad = () => {
    // paint的更新不稳定，需要延迟到后续获取
    setTimeout(() => {
      let { fp, fcp } = pc.getMetrics();
      debugLog('performance-paint',performance.getEntriesByType('paint'))
      trackPaint(fp, fcp);
      pc.stop();
      trackNavigation();
      const resources = rc.getMetrics();
      debugLog("performance-resource", resources);
      trackResource(resources);
      rc.reset();
    }, 2000)

  }
  // 若 SDK 在页面 load 之后才初始化，需要立即执行一次采集流程
  if (document.readyState === "complete") {
    onLoad();
  } else {
    // 页面未完成加载时，等待 load（资源全部加载完成）后采集
    window.addEventListener('load', onLoad, { once: true })
  }

  // 监控lcp/cls等指标
  const lc = lcpClsCollector();
  lc.start();
  // 页面隐藏或dom不可见时上报LCP/CLS指标
  // 切换标签页：触发 visibilitychange(hidden)，不会触发 pagehide。
  // 关闭/刷新/跳转：通常先 visibilitychange(hidden)，随后 pagehide。
  // SPA路由切换一般不触发pagehide
  // window.addEventListener("pagehide",()=>trackPerformanceWithLCPAndClS(lcp,cls),{once:true})

  /**
   * 页面不可见时上报一次 LCP/CLS。
   */
  const onHiddenReportLcpCls = () => {
    const { lcp, cls } = lc.getMetrics();
    trackLCPAndClS(lcp, cls);
    lc.stop();
  }

  /**
   * 页面不可见时收集一次资源。
   */
  const onHiddenCollectResource = () => {
    const resources = rc.getMetrics();
    debugLog("performance-resource(hidden)", resources);
    trackResource(resources);
    rc.reset();
  }

  // 挂载到document上
  document.addEventListener("visibilitychange", onHiddenCollectResource)
  document.addEventListener("visibilitychange", onHiddenReportLcpCls,{once:true})

  // 注销所有监听器
  return () => {
    pc.stop();
    lc.stop();
    rc.stop();
    window.removeEventListener("load", onLoad)
    document.removeEventListener("visibilitychange", onHiddenCollectResource)
    document.removeEventListener("visibilitychange", onHiddenReportLcpCls)
  }
}

/**
 * 规范化资源名称，优先保留 hostname + pathname。
 */
const toResourceName = (value: string): string => {
  if (!value)
    return "[unknown]";
  try {
    const parsed = new URL(value, window.location.href);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return value.split("?")[0] || value;
  }
}

/**
 * 规范化资源类型，兼容 image -> img。
 */
const normalizeInitiatorType = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  return normalized === "image" ? "img" : normalized;
}

/**
 * 创建 Resource 持续采集器。
 */
const resourceCollector = () => {
  if (typeof PerformanceObserver === "undefined") {
    throw new TypeError("PerformanceObserver未定义")
  }
  const resources: Array<{ name: string; initiatorType: string; duration: number }> = [];
  /**
   * 从 ResourceTiming 列表提取并缓存可用样本。
   */
  const collectResourceEntries = (entries: PerformanceEntry[]) => {
    (entries as PerformanceResourceTiming[])
      .map((entry) => ({
        name: toResourceName(entry.name),
        initiatorType: normalizeInitiatorType(entry.initiatorType || "unknown"),
        duration: entry.duration,
      }))
      .filter(
        (entry) =>
          Number.isFinite(entry.duration)
          && entry.duration >= 0
          && STATIC_RESOURCE_INITIATOR_TYPES.has(entry.initiatorType),
      )
      .forEach((entry) => {
        resources.push(entry)
      })
  }
  const resourceObserver = new PerformanceObserver((list) => {
    collectResourceEntries(list.getEntries())
  })

  return {
    // 开始监听资源加载明细
    start: () => {
      resourceObserver.observe({ type: "resource", buffered: true })
    },
    // 停止监听并释放观察器
    stop: () => {
      resourceObserver.disconnect();
    },
    // 返回排序截断后的样本快照
    getMetrics: () => {
      return [...resources]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, MAX_RESOURCE_SAMPLES)
        .map((entry) => ({
          name: entry.name,
          initiatorType: entry.initiatorType,
          duration: Number(entry.duration.toFixed(2)),
        }))
    },
    // 清空缓存，便于后续按新时机重新取样
    reset: () => {
      resources.length = 0;
    },
  }
}


/**
 * 创建 LCP/CLS 持续采集器。
 */
const lcpClsCollector = () => {
  // 监听LCP和CLS 由于LCP和CLS会不断更新，所以必须使用Observer实时监听
  if (typeof PerformanceObserver === 'undefined') {
    if (typeof PerformanceObserver === "undefined") {
      throw new TypeError("PerformanceObserver未定义")
    }
  }
  let lcp: number | null = null;
  let cls: number = 0;
  // 注册LCP监听器，取最后一次绘制
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastPaint = entries[entries.length - 1] as LargestContentfulPaint;
    if (lastPaint)
      lcp = lastPaint.startTime;
  })
  // 注册CLS监听器
  const clsObserver = new PerformanceObserver((list) => {
    for (let entry of list.getEntries() as LayoutShift[]) {
      // 最近用户输入导致的布局偏移不计入
      if (!entry.hadRecentInput)
        cls += entry.value;
    }
  });
  return {
    // 开始监听 buffered可拿到更早的记录
    start: () => {
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      clsObserver.observe({ type: "layout-shift", buffered: true })
    },
    // 释放资源
    stop: () => {
      lcpObserver.disconnect();
      clsObserver.disconnect();
    },
    // 返回指标
    getMetrics: () => ({ lcp, cls })
  }
}

/**
 * 创建 Paint 瞬时指标采集器。
 */
const paintCollector = () => {
  if (typeof PerformanceObserver === "undefined") {
    throw new TypeError("PerformanceObserver未定义")
  }
  let fp: number | null = null;
  let fcp: number | null = null;
  /**
   * 从 PerformanceEntry 列表中提取 FP/FCP。
   */
  const collectPaintEntries = (entries: PerformanceEntry[]) => {
    for (const entry of entries) {
      if (entry.name === 'first-paint')
        fp = entry.startTime;
      if (entry.name === 'first-contentful-paint')
        fcp = entry.startTime;
    }
  }
  const paintObserver = new PerformanceObserver((list) => {
    collectPaintEntries(list.getEntries())
  })

  return {
    start: () => {
      paintObserver.observe({ type: 'paint', buffered: true })
    },
    stop: () => {
      paintObserver.disconnect();
    },
    getMetrics: () => ({ fp, fcp }),
  };
}
