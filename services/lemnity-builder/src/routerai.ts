type GatewayConfig = { baseUrl: string; apiKey: string };

export function getGatewayConfig(): GatewayConfig {
  const rawBase = process.env.AI_GATEWAY_BASE_URL?.trim();
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!rawBase || !apiKey) {
    throw new Error("AI_GATEWAY_BASE_URL или AI_GATEWAY_API_KEY не заданы (нужны для Lemnity Builder).");
  }
  return { baseUrl: rawBase.replace(/\/+$/, ""), apiKey };
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function requestChat(input: {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  user?: string;
}) {
  const { baseUrl, apiKey } = getGatewayConfig();
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      stream: input.stream,
      ...(input.stream ? { stream_options: { include_usage: true } } : {}),
      ...(input.user ? { user: input.user } : {})
    })
  });
}

export async function requestJsonCompletion(input: {
  model: string;
  prompt: string;
  user?: string;
}): Promise<string> {
  const res = await requestChat({
    model: input.model,
    messages: [{ role: "user", content: input.prompt }],
    stream: false,
    user: input.user
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "RouterAI error");
    throw new Error(text.slice(0, 2000));
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
  const text = json.choices?.[0]?.message?.content;
  return typeof text === "string" ? text : "";
}

export async function* streamChatCompletion(input: {
  model: string;
  userMessage?: string;
  prompt?: string;
  user?: string;
}): AsyncGenerator<string> {
  const res = await requestChat({
    model: input.model,
    messages: [{ role: "user", content: input.prompt ?? input.userMessage ?? "" }],
    stream: true,
    user: input.user
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "RouterAI error");
    throw new Error(text.slice(0, 2000));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Пустой ответ стрима RouterAI");

  const decoder = new TextDecoder();
  let carry = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    const parts = carry.split("\n");
    carry = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.replace(/\r$/, "").trim();
      if (!trimmed.startsWith("data:")) continue;
      const raw = trimmed.slice("data:".length).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const json = JSON.parse(raw) as { choices?: Array<{ delta?: { content?: string } }> };
        const piece = json.choices?.[0]?.delta?.content;
        if (typeof piece === "string" && piece.length > 0) {
          yield piece;
        }
      } catch {
        // ignore malformed chunk
      }
    }
  }
}
