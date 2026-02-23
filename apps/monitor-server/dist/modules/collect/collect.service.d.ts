import type { CollectPayload } from "./collect.types";
/**
 * 按 payload.type 分发到对应处理模块，避免路由层堆积业务逻辑。
 */
export declare const handleCollect: (payload: CollectPayload) => Promise<void>;
//# sourceMappingURL=collect.service.d.ts.map