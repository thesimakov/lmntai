import type { RouterAICompletionSettings } from "@/lib/agent-models";

export type DeepSeekChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function isDeepSeekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

function getConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const baseUrl = (process.env.DEEPSEEK_API_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY не задан.");
  }
  return { baseUrl, apiKey };
}

export type DeepSeekJsonResult = {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
};

export async function requestDeepSeekChatJson(input: {
  messages: DeepSeekChatMessage[];
  model?: string;
  settings?: RouterAICompletionSettings;
  user?: string;
}): Promise<DeepSeekJsonResult> {
  const { baseUrl, apiKey } = getConfig();
  const model = input.model?.trim() || process.env.DEEPSEEK_CHAT_MODEL?.trim() || "deepseek-chat";

  const body: Record<string, unknown> = {
    model,
    messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    stream: false
  };

  if (typeof input.settings?.temperature === "number") {
    body.temperature = input.settings.temperature;
  }
  if (typeof input.settings?.top_p === "number") {
    body.top_p = input.settings.top_p;
  }
  if (typeof input.settings?.max_completion_tokens === "number") {
    body.max_tokens = input.settings.max_completion_tokens;
  }
  if (input.user) {
    body.user = input.user;
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "DeepSeek error");
    throw new Error(text.slice(0, 2000));
  }

  type DeepSeekCompletionJson = {
    model?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: {
      prompt_tokens?: unknown;
      completion_tokens?: unknown;
      total_tokens?: unknown;
    };
  };

  const json = (await res.json()) as DeepSeekCompletionJson;
  const textRaw = json.choices?.[0]?.message?.content;
  const text = typeof textRaw === "string" ? textRaw : "";
  const modelOut = typeof json.model === "string" ? json.model : undefined;

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

  return { text, usage, model: modelOut };
}
