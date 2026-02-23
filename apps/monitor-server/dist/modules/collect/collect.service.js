import { insertError, insertEvent } from "./collect.repository";
/**
 * 按 payload.type 分发到对应处理模块，避免路由层堆积业务逻辑。
 */
export const handleCollect = async (payload) => {
    if (payload.type === "event") {
        await insertEvent(payload);
        return;
    }
    await insertError(payload);
};
//# sourceMappingURL=collect.service.js.map