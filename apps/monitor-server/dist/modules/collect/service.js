import { insertError, insertEvent } from "./repository";
const normalizeErrorType = (rawType) => {
    if (!rawType)
        return undefined;
    const type = rawType.trim().toLowerCase();
    if (!type)
        return undefined;
    if (type === "runtime")
        return "runtime";
    if (type === "promise" || type === "unhandledrejection") {
        return "promise";
    }
    if (type === "resource" || type === "resource-error") {
        return "resource";
    }
    return rawType.trim();
};
const normalizeErrorPayload = (payload) => {
    const normalizedType = normalizeErrorType(payload.data.type);
    const { type: _rawType, ...restData } = payload.data;
    const normalizedData = normalizedType ? { ...restData, type: normalizedType } : restData;
    return {
        ...payload,
        data: normalizedData,
    };
};
/**
 * Dispatch collect payload to event/error persistence.
 * Error payloads are normalized before insert to keep `error_type` stable.
 */
export const handleCollect = async (payload) => {
    if (payload.type === "event") {
        await insertEvent(payload);
        return;
    }
    await insertError(normalizeErrorPayload(payload));
};
//# sourceMappingURL=service.js.map