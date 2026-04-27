import type { MessageKey } from "@/lib/i18n";

type TFn = (key: MessageKey) => string;

/**
 * Тело ответа lemnity-builder /api/lemnity-ai с JSON { code, msg, data } в чате больше не показывать сырым.
 */
export function formatLemnityBridgeErrorBody(text: string, t: TFn): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return t("playground_lemnity_api_network_error");
  }
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    if (trimmed.length <= 500) {
      return trimmed;
    }
    return t("playground_lemnity_api_network_error");
  }
  try {
    const j = JSON.parse(trimmed) as { code?: number; msg?: string; data?: unknown };
    if (j && typeof j.msg === "string") {
      switch (j.msg) {
        case "database_unavailable":
          return t("error_lemnity_builder_db_unavailable");
        case "Unauthorized":
          return t("error_lemnity_unauthorized");
        case "message_required":
          return t("playground_lemnity_message_required");
        case "not_found":
          return t("playground_lemnity_not_found");
        case "bad_request":
        case "payload_too_large":
          return t("playground_lemnity_bad_request");
        default:
          if (j.msg.length <= 200 && j.msg.length > 0) {
            return j.msg;
          }
      }
    }
  } catch {
    // not JSON
  }
  if (trimmed.length <= 300) {
    return trimmed;
  }
  return t("playground_lemnity_api_network_error");
}
