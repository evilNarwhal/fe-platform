// src/sdk/error.ts
var RESOURCE_TAGS = /* @__PURE__ */ new Set(["IMG", "SCRIPT", "LINK", "AUDIO", "VIDEO"]);
var getResourceUrl = (target) => {
  if (target instanceof HTMLScriptElement) return target.src;
  if (target instanceof HTMLLinkElement) return target.href;
  if (target instanceof HTMLImageElement) return target.currentSrc || target.src;
  if (target instanceof HTMLAudioElement || target instanceof HTMLVideoElement) return target.currentSrc || target.src;
  return "";
};
var registerErrorHandlers = () => {
  const onRuntimeError = (event) => {
    trackError({
      message: event.message,
      stack: event.error?.stack,
      type: "runtime",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  };
  window.addEventListener("error", onRuntimeError);
  const onUnhandledRejection = (event) => {
    const reason = typeof event.reason === "string" ? event.reason : JSON.stringify(event.reason);
    trackError({
      message: `\u672A\u5904\u7406\u7684Promise\u5F02\u5E38: ${reason}`,
      type: "promise"
    });
  };
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  const onResourceError = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!RESOURCE_TAGS.has(target.tagName)) return;
    const url = getResourceUrl(target);
    if (!url) return;
    trackError({
      message: `\u8D44\u6E90\u52A0\u8F7D\u5931\u8D25: ${target.tagName} \u9875\u9762\uFF1A${window.location.href || "\u672A\u77E5"} `,
      filename: url,
      type: "resource"
    });
  };
  window.addEventListener("error", onResourceError, true);
  const onFontError = (event) => {
    trackError({
      type: "resource",
      message: `\u5B57\u4F53\u52A0\u8F7D\u5931\u8D25 \u9875\u9762: ${location.href}`,
      filename: event.fontfaces.join(" and ")
    });
  };
  document.fonts?.addEventListener?.("loadingerror", onFontError);
  return () => {
    window.removeEventListener("error", onRuntimeError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    window.removeEventListener("error", onResourceError, true);
    document.fonts?.removeEventListener?.("loadingerror", onFontError);
  };
};

// src/sdk/pageview.ts
var trackPageView = (url) => {
  trackEvent({
    name: "page-view",
    props: {
      // 当前页面 URL
      url: url ?? location.href,
      // 当前页面的来源页面地址，例如搜索结果页；直接输入地址跳转时通常为空字符串
      referrer: document.referrer
    }
  });
};
var registerPageView = () => {
  trackPageView();
  const onPopState = () => trackPageView();
  window.addEventListener("popstate", onPopState);
  const wrap = (fn) => {
    return function(...args) {
      const result = fn.apply(this, args);
      trackPageView();
      return result;
    };
  };
  const oriPushState = history.pushState;
  const oriReplaceState = history.replaceState;
  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);
  return () => {
    window.removeEventListener("popstate", onPopState);
    history.pushState = oriPushState;
    history.replaceState = oriReplaceState;
  };
};

// src/sdk/performance.ts
var MAX_RESOURCE_SAMPLES = 20;
var STATIC_RESOURCE_INITIATOR_TYPES = /* @__PURE__ */ new Set(["script", "link", "css", "img", "font"]);
var trackPaint = (fp, fcp) => {
  trackEvent(
    {
      name: "performance-paint",
      props: {
        paints: {
          fcp,
          fp
        }
      }
    }
  );
};
var trackLCPAndClS = (lcp, cls) => {
  trackEvent({
    name: "performance-listening",
    props: {
      lcp,
      // 单位：ms
      cls
      // 无单位
    }
  });
};
var trackNavigation = () => {
  const navigation = performance?.getEntriesByType("navigation")[0];
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
        requestStart: navigation.requestStart
      } : null
    }
  });
};
var trackResource = (resources) => {
  trackEvent({
    name: "performance-resource",
    props: {
      resources
    }
  });
};
var registerPerformance = () => {
  const pc = paintCollector();
  const rc = resourceCollector();
  pc.start();
  rc.start();
  const onLoad = () => {
    setTimeout(() => {
      let { fp, fcp } = pc.getMetrics();
      debugLog("performance-paint", performance.getEntriesByType("paint"));
      trackPaint(fp, fcp);
      pc.stop();
      trackNavigation();
      const resources = rc.getMetrics();
      debugLog("performance-resource", resources);
      trackResource(resources);
      rc.reset();
    }, 2e3);
  };
  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad, { once: true });
  }
  const lc = lcpClsCollector();
  lc.start();
  const onHiddenReportLcpCls = () => {
    const { lcp, cls } = lc.getMetrics();
    trackLCPAndClS(lcp, cls);
    lc.stop();
  };
  const onHiddenCollectResource = () => {
    const resources = rc.getMetrics();
    debugLog("performance-resource(hidden)", resources);
    trackResource(resources);
    rc.reset();
  };
  document.addEventListener("visibilitychange", onHiddenCollectResource);
  document.addEventListener("visibilitychange", onHiddenReportLcpCls, { once: true });
  return () => {
    pc.stop();
    lc.stop();
    rc.stop();
    window.removeEventListener("load", onLoad);
    document.removeEventListener("visibilitychange", onHiddenCollectResource);
    document.removeEventListener("visibilitychange", onHiddenReportLcpCls);
  };
};
var toResourceName = (value) => {
  if (!value)
    return "[unknown]";
  try {
    const parsed = new URL(value, window.location.href);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return value.split("?")[0] || value;
  }
};
var normalizeInitiatorType = (value) => {
  const normalized = value.trim().toLowerCase();
  return normalized === "image" ? "img" : normalized;
};
var resourceCollector = () => {
  if (typeof PerformanceObserver === "undefined") {
    throw new TypeError("PerformanceObserver\u672A\u5B9A\u4E49");
  }
  const resources = [];
  const collectResourceEntries = (entries) => {
    entries.map((entry) => ({
      name: toResourceName(entry.name),
      initiatorType: normalizeInitiatorType(entry.initiatorType || "unknown"),
      duration: entry.duration
    })).filter(
      (entry) => Number.isFinite(entry.duration) && entry.duration >= 0 && STATIC_RESOURCE_INITIATOR_TYPES.has(entry.initiatorType)
    ).forEach((entry) => {
      resources.push(entry);
    });
  };
  const resourceObserver = new PerformanceObserver((list) => {
    collectResourceEntries(list.getEntries());
  });
  return {
    // 开始监听资源加载明细
    start: () => {
      resourceObserver.observe({ type: "resource", buffered: true });
    },
    // 停止监听并释放观察器
    stop: () => {
      resourceObserver.disconnect();
    },
    // 返回排序截断后的样本快照
    getMetrics: () => {
      return [...resources].sort((a, b) => b.duration - a.duration).slice(0, MAX_RESOURCE_SAMPLES).map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        duration: Number(entry.duration.toFixed(2))
      }));
    },
    // 清空缓存，便于后续按新时机重新取样
    reset: () => {
      resources.length = 0;
    }
  };
};
var lcpClsCollector = () => {
  if (typeof PerformanceObserver === "undefined") {
    if (typeof PerformanceObserver === "undefined") {
      throw new TypeError("PerformanceObserver\u672A\u5B9A\u4E49");
    }
  }
  let lcp = null;
  let cls = 0;
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastPaint = entries[entries.length - 1];
    if (lastPaint)
      lcp = lastPaint.startTime;
  });
  const clsObserver = new PerformanceObserver((list) => {
    for (let entry of list.getEntries()) {
      if (!entry.hadRecentInput)
        cls += entry.value;
    }
  });
  return {
    // 开始监听 buffered可拿到更早的记录
    start: () => {
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    },
    // 释放资源
    stop: () => {
      lcpObserver.disconnect();
      clsObserver.disconnect();
    },
    // 返回指标
    getMetrics: () => ({ lcp, cls })
  };
};
var paintCollector = () => {
  if (typeof PerformanceObserver === "undefined") {
    throw new TypeError("PerformanceObserver\u672A\u5B9A\u4E49");
  }
  let fp = null;
  let fcp = null;
  const collectPaintEntries = (entries) => {
    for (const entry of entries) {
      if (entry.name === "first-paint")
        fp = entry.startTime;
      if (entry.name === "first-contentful-paint")
        fcp = entry.startTime;
    }
  };
  const paintObserver = new PerformanceObserver((list) => {
    collectPaintEntries(list.getEntries());
  });
  return {
    start: () => {
      paintObserver.observe({ type: "paint", buffered: true });
    },
    stop: () => {
      paintObserver.disconnect();
    },
    getMetrics: () => ({ fp, fcp })
  };
};

// src/sdk/request.ts
var trackRequest = (req) => {
  trackEvent({ name: "request", props: req });
};
var resolveStartTime = (value) => typeof value === "number" && Number.isFinite(value) ? value : performance.now();
var registerFetch = () => {
  const oriFetch2 = window.fetch;
  window.fetch = async (input, init2) => {
    const startTime = performance.now();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = ((input instanceof Request ? input.method : init2?.method) || "GET").toUpperCase();
    try {
      const res = await oriFetch2(input, init2);
      trackRequest({
        url,
        method,
        status: res.status,
        duration: performance.now() - startTime,
        ok: res.ok,
        source: "fetch"
      });
      return res;
    } catch (error) {
      trackRequest({
        url,
        method,
        duration: performance.now() - startTime,
        ok: false,
        error: error?.message || "fetch error",
        source: "fetch"
      });
      throw error;
    }
  };
  return () => {
    window.fetch = oriFetch2;
  };
};
var registerAxios = (instance) => {
  if (!instance?.interceptors?.request?.use || !instance?.interceptors?.response?.use) {
    throw new TypeError("\u4E0D\u5408\u6CD5\u7684axios\u5B9E\u4F8B");
  }
  const reqId = instance.interceptors.request.use((config) => {
    config.__startTime = performance.now();
    return config;
  });
  const resId = instance.interceptors.response.use(
    (res) => {
      try {
        debugLog("axios\u54CD\u5E94\u6570\u636E\uFF1A", res);
        const config = res?.config ?? {};
        const startTime = resolveStartTime(config.__startTime);
        trackRequest({
          url: config.url || "",
          method: (config.method || "GET").toUpperCase(),
          status: res.status,
          duration: performance.now() - startTime,
          ok: true,
          source: "axios"
        });
      } catch (error) {
        trackError({
          message: error?.message || "track axios success failed",
          type: "SDKAxiosTrackError"
        });
      }
      return res;
    },
    // 处理响应失败，一样记录url、耗时等信息
    (err) => {
      try {
        const config = err?.config ?? err?.response?.config ?? {};
        const startTime = resolveStartTime(config.__startTime);
        trackRequest({
          url: config.url || "",
          method: (config.method || "GET").toUpperCase(),
          // 网络错误可能没有response
          status: err?.response?.status,
          duration: performance.now() - startTime,
          ok: false,
          error: err?.message,
          source: "axios"
        });
      } catch (error) {
        trackError({
          message: error?.message || "track axios error failed",
          type: "SDKAxiosTrackError"
        });
      }
      throw err;
    }
  );
  return () => {
    instance.interceptors.request.eject(reqId);
    instance.interceptors.response.eject(resId);
  };
};

// src/sdk/core.ts
var defaultConfig = {
  endpoint: "",
  appId: "",
  env: "dev",
  release: "",
  userId: "",
  exclude: ["axios"],
  debug: true,
  headers: {},
  withCredentials: false,
  autoTrack: true,
  sampleRate: 1
};
var currentConfig = null;
var initialed = false;
var oriFetch = null;
var registerCallbacks = /* @__PURE__ */ new Map([
  ["error", registerErrorHandlers],
  ["fetch", registerFetch],
  ["pageview", registerPageView],
  ["performance", registerPerformance],
  ["axios", registerAxios]
]);
var registerStates = /* @__PURE__ */ new Map();
var pendingRegisterTaskMap = /* @__PURE__ */ new Map();
var getConfig = () => currentConfig ?? defaultConfig;
var getBasePayload = () => {
  const { appId, env, release, userId } = getConfig();
  const basePayload = {
    appId,
    env,
    release,
    userId
  };
  return basePayload;
};
var send = (payload) => {
  const { endpoint, headers, withCredentials } = getConfig();
  if (!endpoint)
    return;
  debugLog("\u53D1\u9001\u6570\u636E\uFF1A", payload);
  if (!oriFetch)
    throw new TypeError("fetch\u65B9\u6CD5\u4E0D\u5B58\u5728");
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
    debugLog("\u53D1\u9001\u5931\u8D25\uFF1A", error);
  });
};
var trackEvent = (event) => {
  if (!event)
    return;
  const basePayload = getBasePayload();
  const payload = {
    type: "event",
    timestamp: Date.now(),
    data: event,
    ...basePayload
  };
  send(payload);
};
var trackError = (error) => {
  if (!error)
    return;
  const basePayload = getBasePayload();
  const payload = {
    type: "error",
    timestamp: Date.now(),
    data: error,
    ...basePayload
  };
  send(payload);
};
var debugLog = (...data) => {
  if (getConfig().debug) {
    console.log(`monitor-sdk DEBUG INFO`, ...data);
  }
};
var init = (options = {}) => {
  try {
    if (initialed) {
      debugLog("\u5DF2\u521D\u59CB\u5316\uFF0C\u8DF3\u8FC7\u521D\u59CB\u5316\u6D41\u7A0B");
      return currentConfig;
    }
    if (typeof window === "undefined" || !window) {
      throw new TypeError(`window\u5BF9\u8C61\u672A\u5B9A\u4E49\u6216\u4E0D\u53EF\u7528`);
    }
    oriFetch = window.fetch;
    currentConfig = {
      ...defaultConfig,
      ...options,
      // 引用类型需要深合并，避免覆盖
      headers: { ...defaultConfig.headers, ...options.headers ?? {} },
      exclude: [...defaultConfig.exclude, ...options.exclude ?? []]
    };
    debugLog("\u521D\u59CB\u5316\u914D\u7F6E\uFF1A", currentConfig);
    Array.from(registerCallbacks.entries()).forEach(([key, callback]) => {
      const state = registerStates.get(key);
      if (!state) {
        initRegisterState(key, callback);
        return;
      }
    });
    initialed = true;
    if (currentConfig.autoTrack) {
      Array.from(registerStates.keys()).filter((key) => !getConfig().exclude.includes(key)).forEach((key) => register(key));
    }
    flushPendingRegisters();
    return currentConfig;
  } catch (err) {
    debugLog(`init\u521D\u59CB\u5316\u5F02\u5E38\uFF1A${err}`);
    throw err;
  }
};
var register = (key, mode = "skip", ...args) => {
  if (!initialed) {
    if (mode === "preload") {
      debugLog(`\u63D0\u524D\u521D\u59CB\u5316\u5E76\u6CE8\u518C\u76D1\u542C\u5668 ${key} `);
      getRegisterState(key);
      updateRegisterState(key, ...args);
      return;
    }
    pendingRegisterTaskMap.set(key, { mode: "replace", args });
    debugLog(`\u76D1\u542C\u5668 ${key} \u6682\u5B58\uFF0C\u7B49\u5F85\u521D\u59CB\u5316\u5B8C\u6210\u540E\u6267\u884C`);
    return;
  }
  const rs = getRegisterState(key);
  if (!rs)
    return;
  const hasRegistered = rs.registered;
  if (!hasRegistered) {
    updateRegisterState(key, ...args);
    return safeCleanup(key);
  }
  if (hasRegistered && mode === "skip") {
    debugLog(`\u5DF2\u6CE8\u518C ${key} \uFF0C\u6267\u884C\u8DF3\u8FC7`);
    return safeCleanup(key);
  }
  if (hasRegistered && mode === "replace") {
    try {
      debugLog(`\u5DF2\u6CE8\u518C ${key} \uFF0C\u6267\u884C\u66FF\u6362`);
      const cleanup = safeCleanup(key);
      if (cleanup)
        cleanup();
      updateRegisterState(key, ...args);
      return safeCleanup(key);
    } catch (error) {
      throw `\u76D1\u542C\u5668 ${key} \u66FF\u6362\u5931\u8D25\uFF1A, ${error}`;
    }
  }
  return;
};
var getRegisterState = (key) => {
  let rs = registerStates.get(key);
  if (!rs) {
    debugLog(`\u5C1D\u8BD5\u6CE8\u518C\u76D1\u542C\u5668 ${key} `);
    const callback = getRegisterCallback(key);
    initRegisterState(key, callback);
    rs = registerStates.get(key);
  }
  if (!rs) throw new Error(`\u76D1\u542C\u5668 ${key} \u4E0D\u5B58\u5728`);
  return rs;
};
var getRegisterCallback = (key) => {
  const callback = registerCallbacks.get(key);
  if (!callback) throw new Error(`\u672A\u627E\u5230\u76D1\u542C\u5668 ${key} \u7684\u6CE8\u518C\u56DE\u8C03`);
  return callback;
};
var initRegisterState = (key, callback) => {
  registerStates.set(key, { registered: false, registerCallback: callback, cleanup: void 0 });
  debugLog(`\u76D1\u542C\u5668 ${key} \u5DF2\u521D\u59CB\u5316\u4E3A\u5F85\u6CE8\u518C\u72B6\u6001`);
};
var updateRegisterState = (key, ...args) => {
  try {
    const rs = getRegisterState(key);
    if (!rs?.registerCallback) {
      throw new Error(`\u6267\u884C\u5931\u8D25\uFF0C\u672A\u627E\u5230\u76D1\u542C\u5668 ${key} `);
    }
    debugLog(`\u6CE8\u518C\u76D1\u542C\u5668 ${key} \u5E76\u66F4\u65B0\u76D1\u542C\u5668\u72B6\u6001`);
    rs.cleanup = rs.registerCallback(...args);
    rs.registered = true;
    registerStates.set(key, rs);
  } catch (err) {
    throw err;
  }
};
var clearResisterState = (key) => {
  const rs = getRegisterState(key);
  if (rs) {
    debugLog(`\u521D\u59CB\u5316\u76D1\u542C\u5668 ${key} \u72B6\u6001`);
    initRegisterState(key, getRegisterCallback(key));
  }
};
var safeCleanup = (key) => {
  const rs = getRegisterState(key);
  return () => {
    if (!rs?.cleanup) {
      throw new Error(`\u76D1\u542C\u5668 ${key} \u7F3A\u5C11\u5BF9\u5E94\u7684\u6E05\u7406\u51FD\u6570`);
    }
    if (rs.registered === false) {
      debugLog(`\u76D1\u542C\u5668 ${key} \u672A\u6CE8\u518C\uFF0C\u6E05\u7406\u5B8C\u6BD5`);
      return;
    }
    debugLog(`\u6B63\u5728\u6E05\u7406\u76D1\u542C\u5668 ${key} `);
    rs.cleanup();
    clearResisterState(key);
  };
};
var flushPendingRegisters = () => {
  if (!pendingRegisterTaskMap.size)
    return;
  const tasks = Array.from(pendingRegisterTaskMap.entries());
  pendingRegisterTaskMap.clear();
  tasks.forEach(([key, task]) => {
    register(key, task.mode, ...task.args);
  });
};
export {
  init,
  register,
  trackError,
  trackEvent
};
