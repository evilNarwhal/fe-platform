import React from "react";
import { BookOpenText, CheckCircle2, Code2, ListTree, Network } from "lucide-react";

import GlassCard from "@/components/GlassCard";

const codeBlockClass =
  "mt-3 overflow-x-auto rounded-xl border border-border/70 bg-muted/40 p-3 text-xs leading-5 text-foreground/90";

const tocItems = [
  { id: "quick-start", label: "快速开始" },
  { id: "init-api", label: "初始化 SDK" },
  { id: "track-event-api", label: "自定义事件 / Error 上报" },
  { id: "register-api", label: "注册性能监控" },
  { id: "auto-collection", label: "自动采集能力" },
  { id: "best-practice", label: "常见问题" },
] as const;

const installSnippet = `pnpm add monitor-sdk`;

const quickStartSnippet = `import { init } from "monitor-sdk";

init({
  endpoint: "http://localhost:4000/api/v1/collect",
  appId: "blog-frontend",
  env: "prod",
  release: "1.3.0",
  userId: "user-1001",
  autoTrack: true,
  debug: false,
  headers: {
    Authorization: "Bearer <token>",
  },
});`;

const manualReportSnippet = `import { trackEvent, trackError } from "monitor-sdk";

trackEvent({
  name: "checkout_click",
  props: {
    skuId: "sku-1001",
    price: 199,
  },
});

trackError({
  type: "business",
  message: "checkout failed",
  stack: "Error: checkout failed ...",
  filename: "/src/pages/checkout.tsx",
  lineno: 128,
  colno: 17,
});`;

const registerSnippet = `import { register } from "monitor-sdk";
import axios from "axios";

// 默认模式: skip（已注册则跳过）
register("performance");

// replace: 先清理旧监听，再重新注册
register("pageview", "replace");

// axios 需手动传实例
register("axios", "replace", axios);`;

const initSnippet = `import { init } from "monitor-sdk";

init({
  endpoint: "http://localhost:4000/api/v1/collect",
  appId: "blog-frontend",
  env: "prod",
  autoTrack: true,
  debug: false,
});`;

const options = [
  { key: "endpoint", type: "string", desc: "采集接口地址。未配置时 SDK 不发送数据。" },
  { key: "appId", type: "string", desc: "应用标识，用于仪表盘筛选。" },
  { key: "env", type: "'dev' | 'test' | 'prod'", desc: "环境标识。" },
  { key: "release", type: "string", desc: "发布版本号。" },
  { key: "userId", type: "string", desc: "用户标识。" },
  { key: "exclude", type: "RegisterKey[]", desc: "排除自动采集能力，例如 [\"axios\"]。" },
  { key: "autoTrack", type: "boolean", desc: "是否自动启用默认监控，默认 true。" },
  { key: "headers", type: "Record<string, string>", desc: "上报请求附加 Header。" },
  { key: "withCredentials", type: "boolean", desc: "上报请求是否携带 Cookie。" },
  { key: "debug", type: "boolean", desc: "是否输出 SDK 调试日志。" },
];

const SectionCard: React.FC<{ id: string; title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({
  id,
  title,
  icon,
  children,
}) => {
  return (
    <section id={id} className="scroll-mt-24">
      <GlassCard title={title} action={icon}>
        {children}
      </GlassCard>
    </section>
  );
};

const SDKDocsPage: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_240px]">
      <div className="space-y-6">
        <SectionCard id="quick-start" title="快速开始" icon={<BookOpenText className="h-4 w-4 text-primary" />}>
          <p className="text-sm text-muted-foreground">
            推荐流程：先 <code>init</code>，再按需调用 <code>trackEvent</code>/<code>trackError</code>，最后补充
            <code> register</code> 扩展能力（如 axios）。
          </p>
          <pre className={codeBlockClass}>
            <code>{installSnippet}</code>
          </pre>
          <pre className={codeBlockClass}>
            <code>{quickStartSnippet}</code>
          </pre>
        </SectionCard>

        <SectionCard id="init-api" title="初始化 SDK（init）" icon={<Code2 className="h-4 w-4 text-primary" />}>
          <p className="text-sm text-muted-foreground">
            初始化后，SDK 会按配置自动采集常用指标。大多数场景只需关注 endpoint、appId、env 三个关键参数。
          </p>
          <pre className={codeBlockClass}>
            <code>{initSnippet}</code>
          </pre>
          <div className="mt-3 overflow-hidden rounded-xl border border-border/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">参数</th>
                  <th className="px-3 py-2">类型</th>
                  <th className="px-3 py-2">说明</th>
                </tr>
              </thead>
              <tbody>
                {options.map((item) => (
                  <tr key={item.key} className="border-t border-border/60">
                    <td className="px-3 py-2 font-semibold text-foreground"><code>{item.key}</code></td>
                    <td className="px-3 py-2 text-muted-foreground"><code>{item.type}</code></td>
                    <td className="px-3 py-2 text-muted-foreground">{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard id="track-event-api" title="自定义事件 / Error 上报（track）" icon={<Network className="h-4 w-4 text-primary" />}>
          <p className="text-sm text-muted-foreground">
            使用 <code>trackEvent</code> 上报业务行为，使用 <code>trackError</code> 上报业务异常。建议根据业务统一 type，方便后续排查。
          </p>
          <pre className={codeBlockClass}>
            <code>{manualReportSnippet}</code>
          </pre>
          <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
            建议：错误上报尽量携带 <code>filename</code>/<code>lineno</code>/<code>colno</code>，便于在仪表盘里快速定位。
          </div>
        </SectionCard>

        <SectionCard id="register-api" title="注册性能监控（register）" icon={<ListTree className="h-4 w-4 text-primary" />}>
          <p className="text-sm text-muted-foreground">
            通过 <code>register</code> 手动启用或替换监控能力（如性能、路由、请求）。
            <code>mode</code> 支持 <code>skip</code> / <code>replace</code> / <code>preload</code>。
          </p>
          <pre className={codeBlockClass}>
            <code>{registerSnippet}</code>
          </pre>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs xl:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="font-semibold text-foreground">skip</p>
              <p className="mt-1 text-muted-foreground">已注册则复用旧监听（默认）。</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="font-semibold text-foreground">replace</p>
              <p className="mt-1 text-muted-foreground">先清理旧监听，再重注册。</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="font-semibold text-foreground">preload</p>
              <p className="mt-1 text-muted-foreground">init 前提前注册（适合早期埋点）。</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard id="auto-collection" title="自动采集能力">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>1. 页面访问：自动采集首屏与路由切换行为。</p>
            <p>2. 请求监控：自动采集 fetch 请求耗时；axios 可通过 register 接入。</p>
            <p>3. 性能指标：自动采集 FCP、LCP、CLS、资源加载耗时等关键指标。</p>
            <p>4. 错误监控：自动采集运行时错误、Promise 未处理错误和资源加载错误。</p>
          </div>
        </SectionCard>

        <SectionCard id="best-practice" title="常见问题" icon={<CheckCircle2 className="h-4 w-4 text-primary" />}>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>1. 看不到数据：先确认 endpoint 可达，再检查 appId/env 是否与业务端一致。</p>
            <p>2. 数据延迟：确认服务端时间窗口设置与前端上报时区一致。</p>
            <p>3. 重复统计：请求监控和资源监控建议按业务规则做去重。</p>
            <p>4. 线上排查：建议生产环境保留必要错误定位字段，debug 日志默认关闭。</p>
          </div>
        </SectionCard>
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-24 rounded-2xl border border-border/70 bg-card/80 p-4 backdrop-blur-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">目录</p>
          <nav className="space-y-1">
            {tocItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
};

export default SDKDocsPage;
