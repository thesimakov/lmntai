import type { MessageKey } from "@/lib/i18n";

type TFn = (key: MessageKey) => string;

/** nginx/прокси часто отдают HTML-страницу 502/504 вместо JSON/SSE — в чате не показывать сырой HTML. */
export function looksLikeHtmlGatewayGarbage(text: string): boolean {
  const s = text;
  if (!s.trim()) return false;
  if (/^<\s*!DOCTYPE\s+html/i.test(s.trim())) return true;
  if (/^<\s*html[\s>]/i.test(s.trim())) return true;
  if (/<\s*head\s*>/i.test(s) && /<\s*body\s*>/i.test(s)) return true;
  if (/\b504\s+Gateway\s+Time-?out\b/i.test(s)) return true;
  if (/\b502\s+Bad\s+Gateway\b/i.test(s)) return true;
  if (/\b503\s+Service\s+Unavailable\b/i.test(s)) return true;
  if (/<title>\s*(502|503|504)\b/i.test(s)) return true;
  return false;
}

/** Текст ассистента из SSE: отфильтровать случайные HTML-ошибки прокси. */
export function formatLemnityAssistantStreamText(text: string, t: TFn): string {
  if (looksLikeHtmlGatewayGarbage(text)) {
    return t("playground_lemnity_api_network_error");
  }
  return text;
}

/**
 * Тело ответа lemnity-builder /api/lemnity-ai с JSON { code, msg, data } в чате больше не показывать сырым.
 */
export function formatLemnityBridgeErrorBody(text: string, t: TFn): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return t("playground_lemnity_api_network_error");
  }
  if (looksLikeHtmlGatewayGarbage(trimmed)) {
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
