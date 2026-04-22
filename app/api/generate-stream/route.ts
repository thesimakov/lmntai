import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestRouterAIStream } from "@/lib/routerai-client";
import { hasEnoughTokens } from "@/lib/token-manager";
import { destroySandbox, getSandboxMode, sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

type Usage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

function sse(controller: ReadableStreamDefaultController, payload: unknown) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`));
}

function extractUsageFromSSE(buffer: string): Usage | null {
  try {
    const lines = buffer.split("\n");
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i];
      if (!line.startsWith("data: ")) {
        continue;
      }
      const data = JSON.parse(line.slice(6)) as { usage?: Usage };
      if (data?.usage?.total_tokens) {
        return data.usage;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function postGenerateStream(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  if (!hasEnoughTokens(user, 1000)) {
    return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
  }

  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt?.trim()) {
    return new Response("Prompt is required", { status: 400 });
  }

  const { sandboxId } = await sandboxManager.createSandbox("lemnity");

  const routerRes = await requestRouterAIStream({ prompt });
  if (!routerRes.ok || !routerRes.body) {
    await destroySandbox(sandboxId);
    const errText = await routerRes.text().catch(() => "RouterAI error");
    return new Response(errText, { status: 502 });
  }

  const reader = routerRes.body.getReader();
  const decoder = new TextDecoder();

  let raw = "";
  let assembledText = "";

  const stream = new ReadableStream({
    async start(controller) {
      const mode = getSandboxMode();
      sse(controller, {
        type: "step",
        id: "sandbox",
        description: mode === "docker" ? "Песочница Docker (ai-manus)" : "Песочница (локальный прототип)",
        status: "running"
      });
      sse(controller, { type: "log", content: "🎯 Анализирую запрос..." });
      sse(controller, { type: "progress", value: 18 });
      sse(controller, { type: "log", content: "📐 Подбираю структуру..." });
      sse(controller, { type: "progress", value: 32 });
      sse(controller, { type: "log", content: "🧩 Генерирую UI и код..." });
      sse(controller, {
        type: "step",
        id: "llm",
        description: "Стриминг ответа модели",
        status: "running"
      });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          raw += chunk;

          // Пытаемся извлечь контент из OpenAI-совместимых SSE чанков (delta.content)
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonPart = line.slice(6).trim();
            if (!jsonPart || jsonPart === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonPart) as {
                choices?: Array<{ delta?: { content?: unknown } }>;
              };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length) {
                assembledText += delta;
              }
            } catch {
              // ignore
            }
          }

          sse(controller, { type: "progress", value: Math.min(90, 35 + Math.floor(assembledText.length / 250)) });
        }

        sse(controller, {
          type: "step",
          id: "llm",
          description: "Ответ модели получен",
          status: "completed"
        });
        sse(controller, { type: "log", content: "🧱 Применяю код в песочнице..." });
        sse(controller, { type: "progress", value: 93 });
        sse(controller, {
          type: "step",
          id: "apply",
          description: mode === "docker" ? "Запись файлов в контейнер (FastAPI)" : "Запись в локальное хранилище",
          status: "running"
        });
        sse(controller, { type: "tool", name: "file/write", status: "calling", detail: "index.html" });

        // Для прототипа: считаем "кодом" весь текст ответа модели
        const { previewUrl } = await sandboxManager.applyCode(sandboxId, assembledText || raw);

        sse(controller, { type: "tool", name: "file/write", status: "called", detail: "index.html, generated.txt" });

        sse(controller, {
          type: "step",
          id: "apply",
          description: "Превью обновлено",
          status: "completed"
        });
        sse(controller, { type: "preview", previewUrl, sandboxId });
        sse(controller, { type: "done" });

        // usage списываем после стрима
        const usage = extractUsageFromSSE(raw);
        if (usage) {
          await prisma.tokenUsageLog.create({
            data: {
              userId: user.id,
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
              model: "gpt-4o-mini"
            }
          });

          await prisma.user.update({
            where: { id: user.id },
            data: {
              tokenBalance: { decrement: usage.total_tokens }
            }
          });
        }

        controller.close();
      } catch (e) {
        await destroySandbox(sandboxId).catch(() => {});
        sse(controller, { type: "error", message: e instanceof Error ? e.message : "Ошибка стрима" });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive"
    }
  });
}

export const POST = withApiLogging("/api/generate-stream", postGenerateStream);

