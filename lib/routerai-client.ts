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
};

export async function requestRouterAIStream({ prompt, model }: RouterAIPayload) {
  const { baseUrl, apiKey } = getGatewayConfig();
  const targetModel = model ?? DEFAULT_MODEL;

  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [{ role: "user", content: prompt }],
      stream: true,
      stream_options: {
        include_usage: true
      }
    })
  });
}

export async function requestRouterAIJson({
  prompt,
  model
}: RouterAIPayload): Promise<{ text: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  const { baseUrl, apiKey } = getGatewayConfig();
  const targetModel = model ?? DEFAULT_MODEL;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [{ role: "user", content: prompt }],
      stream: false
    })
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
