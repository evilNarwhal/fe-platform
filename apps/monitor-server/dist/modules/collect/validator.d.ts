import type { CollectPayload } from "./types";
/**
 * 最小必要校验：只接收符合 SDK 协议的 event/error 数据。
 */
export declare const validateCollectPayload: (payload: unknown) => payload is CollectPayload;
//# sourceMappingURL=validator.d.ts.map