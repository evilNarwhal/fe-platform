import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { assertEnv, env } from "./config/env";
import { collectRouter } from "./routes/collect.route";
import { dashboardRouter } from "./routes/dashboard.route";
// 启动前先校验关键环境变量，避免运行中才暴露配置问题。
assertEnv({ requireSupabase: !env.dashboardUseMock });
// 创建监控后端应用实例。
const app = express();
// 基础中间件：安全响应头、跨域、JSON 解析、请求日志。
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
// 健康检查接口：用于探活和部署后验证。
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
// SDK 上报入口。
app.use("/api/v1/collect", collectRouter);
// 仪表盘查询入口。
app.use("/api/v1/dashboard", dashboardRouter);
// 兜底 404，避免未匹配路由静默失败。
app.use((_req, res) => {
    res.status(404).json({ code: "NOT_FOUND", message: "route not found" });
});
app.listen(env.port, () => {
    // 启动日志保持简洁，便于本地联调确认地址。
    console.log(`monitor-server running on http://localhost:${env.port}`);
});
//# sourceMappingURL=index.js.map