# fe-platform

`fe-platform` 是一个前后端一体的前端监控示例项目，提供从“SDK 采集 -> 服务端接收 -> 可视化看板展示”的完整链路，便于本地开发、演示与二次扩展。

## 项目组成

- `apps/monitor-dashboard`：监控可视化看板（React + TypeScript + Vite）
- `apps/monitor-server`：监控数据服务端（Node.js + Express + TypeScript）
- `packages/monitor-sdk`：浏览器侧监控 SDK（负责采集与上报）

## monitor-sdk 介绍

`packages/monitor-sdk` 是前端埋点与监控采集的核心包，当前包含：

- 初始化入口：`init(options)`，统一配置上报地址、应用标识、环境等
- 事件上报：`trackEvent(event)`
- 错误上报：`trackError(error)`
- 监听器注册：`register(...)`，支持错误、性能、请求、页面访问等采集能力
- 打包产物：同时输出 `esm`、`cjs` 与类型声明文件（`d.ts`）

常用命令：

```bash
pnpm --filter monitor-sdk build
```

## 快速开始

1. 安装依赖

```bash
pnpm install
```

2. 配置服务端环境变量

在 `apps/monitor-server/.env` 中配置端口、Supabase 等变量。

3. 启动服务端

```bash
pnpm run dev:server
```

4. 启动看板

```bash
pnpm run dev:dashboard
```

## 常用命令

```bash
pnpm run build
pnpm run build:dashboard
pnpm run preview:dashboard
pnpm run lint
```

## 目录结构

```text
fe-platform/
  apps/
    monitor-dashboard/   # 前端监控看板
    monitor-server/      # 后端监控服务
  packages/
    monitor-sdk/         # 监控采集 SDK
    ui/
    utils/
    request/
```
