import { unknownToErrorMessage } from "@/lib/unknown-error-message";

/** User-facing message for failed RouterAI / gateway calls in API routes. */
export function userFacingAiUnavailableMessage(error: unknown): string {
  const msg = unknownToErrorMessage(error).trim();
  if (!msg) return "AI сервис временно недоступен";

  if (msg.includes("AI_GATEWAY_BASE_URL") || msg.includes("AI_GATEWAY_API_KEY")) {
    if (msg.includes("заглушка")) {
      return "В .env.local указан пример ключа RouterAI. Замените AI_GATEWAY_API_KEY на мастер-ключ из личного кабинета routerai.ru.";
    }
    return "AI не настроен на сервере. Проверьте AI_GATEWAY_BASE_URL и AI_GATEWAY_API_KEY.";
  }

  const lower = msg.toLowerCase();
  if (lower.includes("unauthorized") || lower.includes("invalid api key") || msg.includes("401")) {
    return "Ошибка авторизации AI-шлюза. Проверьте API-ключ RouterAI.";
  }
  if (lower.includes("insufficient") && lower.includes("balance")) {
    return "Недостаточно средств на балансе AI-шлюза.";
  }
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("abort")) {
    return "AI не успел ответить вовремя. Попробуйте короче описание или повторите позже.";
  }

  // Short RouterAI JSON error bodies — safe enough to show
  if (msg.length <= 180 && !msg.includes("<!DOCTYPE")) {
    return msg;
  }

  return "AI сервис временно недоступен";
}
