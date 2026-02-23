// 英文文案词典（默认基准词典）：
// - 作为 MessageKey 类型来源
// - 新增 key 时先加在这里，再同步到 zh
const en = {
  "common.copied": "Copied",
  "common.clickToCopy": "Click to copy",
  "common.samples": "samples",
  "common.window": "Window",
  "common.timeWindow": "Time Window",
  "common.selectAppId": "Select app id",

  "nav.dashboard": "Dashboard",
  "nav.toggleSidebar": "Toggle sidebar",
  "nav.toggleTheme": "Toggle light and dark",
  "sidebar.settings": "Settings",
  "sidebar.profile": "Profile",
  "sidebar.billing": "Billing",
  "sidebar.security": "Security",
  "sidebar.notification": "Notification",
  "sidebar.sdkDocs": "SDK Docs",
  "sidebar.upgrade": "Upgrade",
  "sidebar.upgradeDesc": "Upgrade to Pro to access all features",
  "sidebar.accountName": "default",
  "sidebar.accountEmail": "default@gmail.com",

  "kpi.requests": "Requests",
  "kpi.errorRate": "Error Rate",
  "kpi.p75Latency": "P75 Latency",
  "kpi.p95Latency": "P95 Latency",
  "kpi.p99Latency": "P99 Latency",

  "section.performanceExperience": "Performance & Experience",
  "section.requestsErrorRate": "Requests & Error Rate",
  "section.latencyPercentile": "Latency Percentile",
  "section.resourceLatencyPercentile": "Resource Latency Percentile (P75/P95)",
  "section.fcpLcpPercentile": "FCP/LCP Percentile (P75/P90)",
  "section.clsPercentile": "CLS Percentile (P75)",
  "section.recentErrors": "Recent Errors",
  "section.topSlowResources": "Top Slow Resources (P95)",
  "section.topSlowRequests": "Top Slow Requests (P95)",
  "section.topTrafficRoutes": "Top Traffic Routes",

  "range.last24h": "Last 24h",
  "range.last7d": "Last 7d",

  "action.viewDetails": "View Details",

  "error.dashboardApiRequestFailed": "Dashboard API request failed",
  "error.failedToLoadDashboardData": "Failed to load dashboard data",

  "empty.noErrors": "No errors",
  "empty.noSlowResources": "No slow resources",
  "empty.noSlowRequests": "No slow requests",
  "empty.noRouteTrafficData": "No route traffic data",

  "dialog.errorDetails": "Error Details",
  "dialog.type": "Type",
  "dialog.time": "Time",
  "dialog.filename": "Filename",
  "dialog.lineCol": "Line/Col",
  "dialog.message": "Message",
  "dialog.stack": "Stack",

  "footer.region": "Region",
  "footer.regionValue": "AWS-US-EAST-1",
  "footer.version": "Version",
  "footer.docs": "Docs",
  "footer.apiKeys": "API Keys",

  "charts.requests": "Requests",
  "charts.errorRate": "Error Rate",
  "charts.metricLatency": "Latency",
  "charts.metricResource": "Resource",
  "charts.fcpLcpPercentiles": "FCP / LCP Percentiles",
  "charts.clsPercentile": "CLS Percentile",
  "charts.selectedRoute": "Selected Route",
  "charts.routeHintUnselect": "Click the same slice again to unselect.",
  "charts.routeHintInspect": "Click a slice to inspect route details.",
  "charts.routeNoData": "No route traffic data",

  "locale.en": "English",
  "locale.zh": "中文",
} as const;

// 所有可用翻译 key 的联合类型
type MessageKey = keyof typeof en;

// 中文文案词典：
// - 必须与 en 的 key 完全一致
// - 使用 Record<MessageKey, string> 在编译期强约束遗漏/拼写错误
const zh: Record<MessageKey, string> = {
  "common.copied": "已复制",
  "common.clickToCopy": "点击复制",
  "common.samples": "样本",
  "common.window": "窗口",
  "common.timeWindow": "时间窗口",
  "common.selectAppId": "选择 AppId",

  "nav.dashboard": "仪表盘",
  "nav.toggleSidebar": "切换侧边栏",
  "nav.toggleTheme": "切换明暗主题",
  "sidebar.settings": "设置",
  "sidebar.profile": "个人资料",
  "sidebar.billing": "账单",
  "sidebar.security": "安全",
  "sidebar.notification": "通知",
  "sidebar.sdkDocs": "SDK 文档",
  "sidebar.upgrade": "升级",
  "sidebar.upgradeDesc": "升级到 Pro 以访问全部功能",
  "sidebar.accountName": "默认名称",
  "sidebar.accountEmail": "default@gmail.com",

  "kpi.requests": "请求数",
  "kpi.errorRate": "错误率",
  "kpi.p75Latency": "P75 延迟",
  "kpi.p95Latency": "P95 延迟",
  "kpi.p99Latency": "P99 延迟",

  "section.performanceExperience": "性能与体验",
  "section.requestsErrorRate": "请求与错误率",
  "section.latencyPercentile": "延迟分位",
  "section.resourceLatencyPercentile": "资源延迟分位 (P75/P95)",
  "section.fcpLcpPercentile": "FCP/LCP 分位 (P75/P90)",
  "section.clsPercentile": "CLS 分位 (P75)",
  "section.recentErrors": "近期错误",
  "section.topSlowResources": "慢资源 Top (P95)",
  "section.topSlowRequests": "慢请求 Top (P95)",
  "section.topTrafficRoutes": "流量路由 Top",

  "range.last24h": "近 24 小时",
  "range.last7d": "近 7 天",

  "action.viewDetails": "查看详情",

  "error.dashboardApiRequestFailed": "仪表盘接口请求失败",
  "error.failedToLoadDashboardData": "加载仪表盘数据失败",

  "empty.noErrors": "暂无错误",
  "empty.noSlowResources": "暂无慢资源",
  "empty.noSlowRequests": "暂无慢请求",
  "empty.noRouteTrafficData": "暂无路由流量数据",

  "dialog.errorDetails": "错误详情",
  "dialog.type": "类型",
  "dialog.time": "时间",
  "dialog.filename": "文件名",
  "dialog.lineCol": "行/列",
  "dialog.message": "消息",
  "dialog.stack": "堆栈",

  "footer.region": "区域",
  "footer.regionValue": "AWS-US-EAST-1",
  "footer.version": "版本",
  "footer.docs": "文档",
  "footer.apiKeys": "API 密钥",

  "charts.requests": "请求数",
  "charts.errorRate": "错误率",
  "charts.metricLatency": "延迟",
  "charts.metricResource": "资源",
  "charts.fcpLcpPercentiles": "FCP / LCP 分位",
  "charts.clsPercentile": "CLS 分位",
  "charts.selectedRoute": "当前路由",
  "charts.routeHintUnselect": "再次点击同一扇区可取消选中。",
  "charts.routeHintInspect": "点击扇区查看路由详情。",
  "charts.routeNoData": "暂无路由流量数据",

  "locale.en": "English",
  "locale.zh": "中文",
};

// 多语言词典总表，按 locale 分组
export const messages = {
  en,
  zh,
} as const;

// locale 类型：当前仅支持 en / zh
export type Locale = keyof typeof messages;
export type { MessageKey };
