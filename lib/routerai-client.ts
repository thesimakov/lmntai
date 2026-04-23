const DEFAULT_MODEL = "gpt-4o-mini";

export function getGatewayConfig() {
  const baseUrl = process.env.AI_GATEWAY_BASE_URL;
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("AI_GATEWAY_BASE_URL или AI_GATEWAY_API_KEY не заданы.");
  }

  return { baseUrl, apiKey };
}

export type RouterAIPayload = {
  prompt: string;
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

function buildRequestBody(
  payload: RouterAIPayload,
  stream: boolean
): Record<string, unknown> {
  const targetModel = payload.model ?? DEFAULT_MODEL;
  const body: Record<string, unknown> = {
    model: targetModel,
    messages: [{ role: "user", content: payload.prompt }],
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
): Promise<{ text: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
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
    usage?: {
      prompt_tokens?: unknown;
      completion_tokens?: unknown;
      total_tokens?: unknown;
    };
  };

  const json = (await res.json()) as RouterAiChatCompletionJson;
  const textRaw = json.choices?.[0]?.message?.content;
  const text = typeof textRaw === "string" ? textRaw : "";

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

  return { text, usage };
}
