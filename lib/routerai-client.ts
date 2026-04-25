const DEFAULT_MODEL = "gpt-4o-mini";

export function getGatewayConfig() {
  const rawBase = process.env.AI_GATEWAY_BASE_URL?.trim();
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();

  if (!rawBase || !apiKey) {
    throw new Error("AI_GATEWAY_BASE_URL или AI_GATEWAY_API_KEY не заданы.");
  }

  const baseUrl = rawBase.replace(/\/+$/, "");
  return { baseUrl, apiKey };
}

export type RouterAIPayload = {
  /** Используется, если не задано `messages`. */
  prompt?: string;
  messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  settings?: {
    temperature?: number;
    top_p?: number;
    max_completion_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    stop?: string | string[];
  };
  user?: string;
};

export type RouterAIUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type RouterAIJsonResult = {
  text: string;
  usage?: RouterAIUsage;
  model?: string;
};

function buildRequestBody(
  payload: RouterAIPayload,
  stream: boolean
): Record<string, unknown> {
  const targetModel = payload.model ?? DEFAULT_MODEL;
  const messages =
    payload.messages && payload.messages.length > 0
      ? payload.messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: payload.prompt ?? "" }];
  const body: Record<string, unknown> = {
    model: targetModel,
    messages,
    stream
  };
  if (stream) {
    body.stream_options = { include_usage: true };
  }
  if (typeof payload.settings?.temperature === "number") {
    body.temperature = payload.settings.temperature;
  }
  if (typeof payload.settings?.top_p === "number") {
    body.top_p = payload.settings.top_p;
  }
  if (typeof payload.settings?.max_completion_tokens === "number") {
    body.max_completion_tokens = payload.settings.max_completion_tokens;
  }
  if (typeof payload.settings?.presence_penalty === "number") {
    body.presence_penalty = payload.settings.presence_penalty;
  }
  if (typeof payload.settings?.frequency_penalty === "number") {
    body.frequency_penalty = payload.settings.frequency_penalty;
  }
  if (typeof payload.settings?.stop === "string" || Array.isArray(payload.settings?.stop)) {
    body.stop = payload.settings.stop;
  }
  if (payload.user) {
    body.user = payload.user;
  }
  return body;
}

export async function requestRouterAIStream(payload: RouterAIPayload) {
  const { baseUrl, apiKey } = getGatewayConfig();

  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildRequestBody(payload, true))
  });
}

export async function requestRouterAIJson(
  payload: RouterAIPayload
): Promise<RouterAIJsonResult> {
  const { baseUrl, apiKey } = getGatewayConfig();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildRequestBody(payload, false))
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "RouterAI error");
    throw new Error(text);
  }

  type RouterAiChatCompletionJson = {
    choices?: Array<{ message?: { content?: unknown } }>;
    model?: unknown;
    usage?: {
      prompt_tokens?: unknown;
      completion_tokens?: unknown;
      total_tokens?: unknown;
    };
  };

  const json = (await res.json()) as RouterAiChatCompletionJson;
  const textRaw = json.choices?.[0]?.message?.content;
  const text = typeof textRaw === "string" ? textRaw : "";
  const model = typeof json.model === "string" ? json.model : undefined;

  const usageRaw = json.usage;
  const usage =
    usageRaw &&
    typeof usageRaw.prompt_tokens === "number" &&
    typeof usageRaw.completion_tokens === "number" &&
    typeof usageRaw.total_tokens === "number"
      ? {
          prompt_tokens: usageRaw.prompt_tokens,
          completion_tokens: usageRaw.completion_tokens,
          total_tokens: usageRaw.total_tokens
        }
      : undefined;

  return { text, usage, model };
}

function uniqModels(candidates: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of candidates) {
    const model = raw?.trim();
    if (!model || seen.has(model)) continue;
    seen.add(model);
    result.push(model);
  }
  return result;
}

export async function requestRouterAIJsonWithFallback(
  payload: RouterAIPayload,
  modelChain: string[]
): Promise<RouterAIJsonResult & { requestedModel: string; attemptedModels: string[] }> {
  const attemptedModels =
    modelChain.length > 0
      ? uniqModels([...modelChain, payload.model])
      : uniqModels([payload.model, DEFAULT_MODEL]);
  let lastError: unknown = null;

  for (const requestedModel of attemptedModels) {
    try {
      const response = await requestRouterAIJson({ ...payload, model: requestedModel });
      return { ...response, requestedModel, attemptedModels };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("RouterAI error");
}
