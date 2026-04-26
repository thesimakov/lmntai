import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { resolveAgentForTask } from "@/lib/agent-models";
import { isLemnityAiBridgeEnabledServer } from "@/lib/lemnity-ai-bridge-config";
import { requestRouterAIStream } from "@/lib/routerai-client";
import { extractDataJson, splitSseLines } from "@/lib/sse-parser";
import { chargeTokensSafely, estimateUsageFromText, normalizeUsage, type TokenUsage } from "@/lib/token-billing";
import { MIN_TOKENS_GENERATE_STREAM } from "@/lib/plan-config";
import { hasEnoughTokens } from "@/lib/token-manager";
import { destroySandbox, getSandboxMode, sandboxManager } from "@/lib/sandbox-manager";
import { buildRouterGenerationPrompt, isProjectKind } from "@/lib/lemnity-ai-prompt-spec";
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

async function postGenerateStream(req: NextRequest) {
  if (isLemnityAiBridgeEnabledServer()) {
    return new Response("Legacy /api/generate-stream disabled in Lemnity AI bridge mode. Use /api/lemnity-ai/sessions/:id/chat", {
      status: 410
    });
  }

  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const user = guard.data.user;

  if (!hasEnoughTokens(user, MIN_TOKENS_GENERATE_STREAM)) {
    return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
  }

  const body = (await req.json().catch(() => null)) as
    | { prompt?: string; projectKind?: string; agentHint?: string }
    | null;
  const rawPrompt = body?.prompt?.trim();
  if (!rawPrompt) {
    return new Response("Prompt is required", { status: 400 });
  }

  const pk = isProjectKind(body?.projectKind) ? body.projectKind : undefined;
  const prompt = buildRouterGenerationPrompt(rawPrompt, pk);
  const agent = resolveAgentForTask({
    plan: user.plan,
    projectKind: pk,
    task: "generate-stream",
    hint: body?.agentHint
  });

  const sandboxTitle = rawPrompt.slice(0, 120);

  const stream = new ReadableStream({
    async start(controller) {
      const mode = getSandboxMode();
      let sandboxId: string | undefined;
      let raw = "";
      let assembledText = "";
      let lineCarry = "";
      let usageFromStream: TokenUsage | null = null;

      try {
        // До этого ответа клиент держит прогресс ~8%: отдаём SSE сразу, тяжёлое — ниже.
        sse(controller, { type: "log", content: "🧰 Создаю песочницу…" });
        sse(controller, { type: "progress", value: 10 });

        const created = await sandboxManager.createSandbox(sandboxTitle, user.id);
        sandboxId = created.sandboxId;

        sse(controller, {
          type: "step",
          id: "sandbox",
          description: mode === "docker" ? "Песочница Docker (Lemnity AI)" : "Песочница (локальный прототип)",
          status: "running"
        });
        sse(controller, { type: "progress", value: 14 });
        sse(controller, { type: "log", content: "🤖 Подключаюсь к модели…" });
        sse(controller, { type: "progress", value: 16 });

        const routerRes = await requestRouterAIStream({
          prompt,
          model: agent.modelId,
          settings: agent.settings.stream,
          user: user.id
        });

        if (!routerRes.ok || !routerRes.body) {
          await destroySandbox(sandboxId).catch(() => {});
          const errText = await routerRes.text().catch(() => "RouterAI error");
          sse(controller, { type: "error", message: errText });
          controller.close();
          return;
        }

        const reader = routerRes.body.getReader();
        const decoder = new TextDecoder();

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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          raw += chunk;

          const parsed = splitSseLines(chunk, lineCarry);
          lineCarry = parsed.carry;
          const lines = parsed.lines;
          for (const line of lines) {
            const event = extractDataJson(line) as
              | {
                  choices?: Array<{ delta?: { content?: unknown } }>;
                  usage?: Partial<Usage>;
                }
              | null;
            if (!event) continue;
            try {
              const delta = event.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length) {
                assembledText += delta;
              }
              if (event.usage) {
                usageFromStream = normalizeUsage(event.usage);
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
        const lovable = pk === "lovable";
        sse(controller, {
          type: "tool",
          name: "file/write",
          status: "calling",
          detail: lovable ? "src/*.tsx (Lovable) → esbuild" : "index.html"
        });

        const { previewUrl } = lovable
          ? await sandboxManager.applyCodeLovable(sandboxId, assembledText || raw)
          : await sandboxManager.applyCode(sandboxId, assembledText || raw);

        sse(controller, {
          type: "tool",
          name: "file/write",
          status: "called",
          detail: lovable ? "index.html + исходники" : "index.html, generated.txt"
        });

        sse(controller, {
          type: "step",
          id: "apply",
          description: "Превью обновлено",
          status: "completed"
        });
        sse(controller, { type: "preview", previewUrl, sandboxId });
        sse(controller, { type: "done" });

        if (lineCarry.trim()) {
          const event = extractDataJson(lineCarry) as { usage?: Partial<Usage> } | null;
          if (event?.usage) {
            usageFromStream = normalizeUsage(event.usage);
          }
        }

        const fallbackUsage = estimateUsageFromText(prompt, assembledText || raw);
        const charge = await chargeTokensSafely({
          userId: user.id,
          usage: usageFromStream ?? fallbackUsage,
          model: agent.modelId
        });
        if (!charge.charged && charge.reason === "insufficient_balance") {
          const need = charge.usage.total_tokens;
          const bal = charge.balance;
          sse(controller, {
            type: "log",
            content: `⚠️ Превью уже собрано, но списание не выполнено: по этому запросу нужно ${need.toLocaleString("ru-RU")} ток., на балансе ${bal.toLocaleString("ru-RU")}. Пополните баланс или не запускайте несколько сборок одновременно (вкладки / шаги коуча + генерация).`
          });
        }

        controller.close();
      } catch (e) {
        if (sandboxId) await destroySandbox(sandboxId).catch(() => {});
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

