# Monitor Dashboard 代码导读（中文）

本目录是一个基于 `React + TypeScript + Vite + Tailwind + Recharts` 的前端监控仪表盘示例。

当前液态玻璃效果已直接使用开源包：`liquid-glass-react`。

## 启动方式

```bash
pnpm --filter monitor-dashboard dev
```

## 文件结构说明

- `src/main.tsx`
  - React 应用入口，负责把 `App` 挂载到 `#root`。
- `src/App.tsx`
  - 页面主布局，包含顶部、KPI、核心图表区、右侧栏和页脚。
  - 系统状态卡使用 `liquid-glass-react`。
- `src/constants.tsx`
  - 仪表盘演示数据（目前为 mock 数据）。
- `src/types.ts`
  - 图表和业务展示数据类型定义。
- `src/components/Charts.tsx`
  - 图表组件与图表交互逻辑（分位切换、双轴、tooltip 格式化等）。
- `src/components/GlassCard.tsx`
  - 通用玻璃卡片容器。
- `src/index.css`
  - 全局样式与基础玻璃视觉样式。
- `vite.config.ts`
  - Vite 开发/构建配置与环境变量注入。
- `tailwind.config.cjs` / `postcss.config.cjs`
  - Tailwind 与 PostCSS 配置。
- `eslint.config.js`
  - ESLint 规则配置（TS + React Hooks + React Refresh）。
- `tsconfig*.json`
  - TypeScript 编译/类型检查配置（应用端 + Node 配置端）。

## Code Review 建议顺序

1. `src/types.ts`：先看数据结构。
2. `src/constants.tsx`：再看数据来源与字段。
3. `src/components/Charts.tsx`：理解图表如何消费数据。
4. `src/App.tsx`：最后看页面如何组装。

## 注释说明

关键文件已补充中文注释，重点解释：

- 组件职责
- 状态流转
- 图表配置含义
- 数据字段与视图映射关系
- 配置文件的作用与影响
