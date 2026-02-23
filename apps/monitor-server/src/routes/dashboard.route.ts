import { Router, type Router as RouterType } from "express";
import {
  getMockDashboardCharts,
  getMockDashboardErrors,
  getMockDashboardOverview,
  getMockDashboardRoutes,
} from "../modules/dashboard/mock";
import {
  getDashboardCharts,
  getDashboardErrors,
  getDashboardOverview,
  getDashboardRoutes,
} from "../modules/dashboard/service";
import type { DashboardQuery } from "../modules/dashboard/types";
import { env } from "../config/env";

export const dashboardRouter: RouterType = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 解析仪表盘通用查询参数并做合法性校验。
 *
 * 约定：
 * - from/to 未传时，默认取最近 24 小时。
 * - from/to 必须是可解析的日期字符串。
 * - from 必须早于 to。
 * - appId/env 为可选筛选条件。
 *
 * 之所以集中在这里处理，是为了让每个路由只关注业务返回，不重复写参数校验代码。
 */
const parseDashboardQuery = (query: Record<string, unknown>): DashboardQuery => {
  const to = typeof query.to === "string" ? new Date(query.to) : new Date();
  const from =
    typeof query.from === "string" ? new Date(query.from) : new Date(to.getTime() - DAY_MS);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid query: from/to must be valid datetime");
  }
  if (from.getTime() > to.getTime()) {
    throw new Error("Invalid query: from must be earlier than to");
  }

  const parsed: DashboardQuery = { from, to };
  if (typeof query.appId === "string" && query.appId) {
    parsed.appId = query.appId;
  }
  if (query.env === "dev" || query.env === "test" || query.env === "prod") {
    parsed.env = query.env;
  }
  return parsed;
};

const isInvalidQueryError = (error: unknown): error is Error =>
  error instanceof Error && error.message.startsWith("Invalid query");

/**
 * 总览接口：返回 KPI、近期错误、路由分布。
 */
dashboardRouter.get("/overview", async (req, res) => {
  try {
    const query = parseDashboardQuery(req.query as Record<string, unknown>);
    const data = env.dashboardUseMock
      ? getMockDashboardOverview(query)
      : await getDashboardOverview(query);
    res.json(data);
  } catch (error) {
    if (isInvalidQueryError(error)) {
      res.status(400).json({
        code: "INVALID_QUERY",
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      code: "DASHBOARD_OVERVIEW_ERROR",
      message: error instanceof Error ? error.message : "failed to load dashboard overview",
    });
  }
});

/**
 * 图表接口：返回请求/错误率、延迟分位、FCP/LCP、CLS 四类趋势数据。
 */
dashboardRouter.get("/charts", async (req, res) => {
  try {
    const query = parseDashboardQuery(req.query as Record<string, unknown>);
    const data = env.dashboardUseMock
      ? getMockDashboardCharts(query)
      : await getDashboardCharts(query);
    res.json(data);
  } catch (error) {
    if (isInvalidQueryError(error)) {
      res.status(400).json({
        code: "INVALID_QUERY",
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      code: "DASHBOARD_CHARTS_ERROR",
      message: error instanceof Error ? error.message : "failed to load dashboard charts",
    });
  }
});

/**
 * 错误列表接口：返回近期错误明细。
 * - limit 最小 1，最大 100，防止一次性拉取过多数据。
 */
dashboardRouter.get("/errors", async (req, res) => {
  try {
    const query = parseDashboardQuery(req.query as Record<string, unknown>);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const data = env.dashboardUseMock
      ? getMockDashboardErrors(limit)
      : await getDashboardErrors(query, limit);
    res.json({ items: data });
  } catch (error) {
    if (isInvalidQueryError(error)) {
      res.status(400).json({
        code: "INVALID_QUERY",
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      code: "DASHBOARD_ERRORS_ERROR",
      message: error instanceof Error ? error.message : "failed to load dashboard errors",
    });
  }
});

/**
 * 路由分布接口。
 * - type=api|page，默认 api。
 * - limit 最小 1，最大 50。
 */
dashboardRouter.get("/routes", async (req, res) => {
  try {
    const query = parseDashboardQuery(req.query as Record<string, unknown>);
    const type = req.query.type === "page" ? "page" : "api";
    const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 50);
    const data = env.dashboardUseMock
      ? getMockDashboardRoutes(type, limit)
      : await getDashboardRoutes(query, type, limit);
    res.json(data);
  } catch (error) {
    if (isInvalidQueryError(error)) {
      res.status(400).json({
        code: "INVALID_QUERY",
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      code: "DASHBOARD_ROUTES_ERROR",
      message: error instanceof Error ? error.message : "failed to load dashboard routes",
    });
  }
});
