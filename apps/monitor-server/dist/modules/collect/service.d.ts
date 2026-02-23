import type { CollectPayload } from "./types";
/**
 * Dispatch collect payload to event/error persistence.
 * Error payloads are normalized before insert to keep `error_type` stable.
 */
export declare const handleCollect: (payload: CollectPayload) => Promise<void>;
//# sourceMappingURL=service.d.ts.map