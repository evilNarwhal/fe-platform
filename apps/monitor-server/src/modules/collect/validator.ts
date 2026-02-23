import type { CollectPayload } from "./types";

/**
 * 最小必要校验：只接收符合 SDK 协议的 event/error 数据。
 */
export const validateCollectPayload = (
  payload: unknown,
): payload is CollectPayload => {
  if (!payload || typeof payload !== "object") return false;

  const data = payload as Record<string, unknown>;
  if (data.type !== "event" && data.type !== "error") return false;
  if (typeof data.timestamp !== "number" || !Number.isFinite(data.timestamp)) {
    return false;
  }
  if (!data.data || typeof data.data !== "object") return false;

  const detail = data.data as Record<string, unknown>;
  if (data.type === "event") {
    return typeof detail.name === "string" && detail.name.length > 0;
  }

  return typeof detail.message === "string" && detail.message.length > 0;
};
