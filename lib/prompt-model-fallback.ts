const DEFAULT_PROMPT_FREE_MODEL = "deepseek/deepseek-r1:free";
const DEFAULT_PROMPT_FREE_FALLBACK = "openrouter/free";

function parseModelList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqModels(items: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    const model = raw?.trim();
    if (!model || seen.has(model)) continue;
    seen.add(model);
    result.push(model);
  }
  return result;
}

/**
 * Цепочка для prompt-stage:
 * 1) DeepSeek free
 * 2) openrouter/free (случайная free-модель)
 * 3) текущая выбранная модель пользователя
 */
export function buildPromptModelFallbackChain(userSelectedModel: string): string[] {
  const primary = process.env.ROUTERAI_PROMPT_FREE_MODEL?.trim() || DEFAULT_PROMPT_FREE_MODEL;
  const envFallbacks = parseModelList(process.env.ROUTERAI_PROMPT_FREE_FALLBACKS);
  const fallbackList =
    envFallbacks.length > 0
      ? envFallbacks
      : [process.env.ROUTERAI_PROMPT_FREE_FALLBACK?.trim() || DEFAULT_PROMPT_FREE_FALLBACK];

  return uniqModels([primary, ...fallbackList, userSelectedModel]);
}
