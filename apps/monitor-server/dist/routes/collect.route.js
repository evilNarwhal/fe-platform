import { Router } from "express";
import { handleCollect } from "../modules/collect/service";
import { validateCollectPayload } from "../modules/collect/validator";
export const collectRouter = Router();
/**
 * SDK 统一上报入口。
 * 处理流程：
 * 1. 做最小必要字段校验，避免无效数据入库。
 * 2. 按 type(event/error) 分发到对应 service。
 * 3. 成功返回 204，失败返回 500 供调用方识别并重试。
 */
collectRouter.post("/", async (req, res) => {
    if (!validateCollectPayload(req.body)) {
        res.status(400).json({
            code: "INVALID_PAYLOAD",
            message: "payload does not match monitor-sdk schema",
        });
        return;
    }
    try {
        await handleCollect(req.body);
        // 采集接口不返回业务数据，使用 204 减少网络开销。
        res.status(204).send();
    }
    catch (error) {
        // 入库失败不能吞掉，否则会导致调用方误判上报成功。
        res.status(500).json({
            code: "COLLECT_FAILED",
            message: "failed to persist collect payload",
            detail: error instanceof Error ? error.message : "unknown error",
        });
    }
});
//# sourceMappingURL=collect.route.js.map