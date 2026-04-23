import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { resolveAgentForTask } from "@/lib/agent-models";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { chargeTokensSafely, estimateUsageFromText } from "@/lib/token-billing";
import { MIN_TOKENS_PROMPT_BUILDER } from "@/lib/plan-config";
import { hasEnoughTokens } from "@/lib/token-manager";
import { getProjectKindPromptBuilderContextRu, isProjectKind } from "@/lib/manus-prompt-spec";
import { withApiLogging } from "@/lib/with-api-logging";

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function postPromptBuilder(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const user = guard.data.user;
  if (!hasEnoughTokens(user, MIN_TOKENS_PROMPT_BUILDER)) {
    return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        mode?: "questions" | "compose";
        idea?: string;
        qa?: Array<{ q: string; a: string }>;
        projectKind?: string;
        agentHint?: string;
      }
    | null;

  const idea = body?.idea?.trim();
  if (!idea) return new Response("idea is required", { status: 400 });
  const kindCtx = isProjectKind(body?.projectKind)
    ? getProjectKindPromptBuilderContextRu(body.projectKind)
    : "";

  if (body?.mode === "questions") {
    const agent = resolveAgentForTask({
      plan: user.plan,
      projectKind: isProjectKind(body?.projectKind) ? body.projectKind : undefined,
      task: "prompt-questions",
      hint: body?.agentHint
    });

    const systemPrompt = `Ты — продакт/UX-стратег для генерации интерфейса в Lemnity (как план/goal в ai-manus, но результат — один HTML-прототип).
Сгенерируй 6–9 уточняющих вопросов, чтобы собрать промпт для AI-генератора.
Требования:
- вопросы короткие и конкретные; учитывай заданный тип доставляемого результата, если он указан
- покрыть: цель, аудиторию, стиль, структуру блоков/слайдов/секций резюме, CTA, цвет/тон, контент/языки, интеграции
- верни только JSON без текста вокруг:
{ "questions": ["...","..."] }`;

    const fallback = [
      "Какой тип сайта нужен (лендинг/мультистраничный/магазин)?",
      "Какая основная цель сайта (лиды/продажи/бренд/запись)?",
      "Кто целевая аудитория и география?",
      "Какой стиль и референсы нравятся (минимализм/неон/премиум)?",
      "Какие блоки должны быть на главной (герой, тарифы, отзывы, FAQ)?",
      "Какой главный оффер и призыв к действию?",
      "Нужны ли интеграции (Telegram, CRM, платежи)?",
      "Язык и тон: официальный/дружелюбный/дерзкий?"
    ];

    try {
      const { text, usage } = await requestRouterAIJson({
        prompt: `${systemPrompt}${kindCtx}\n\nИдея пользователя:\n${idea}`,
        model: agent.modelId,
        settings: agent.settings.json,
        user: user.id
      });

      const parsed = safeJsonParse<{ questions: string[] }>(text);
      const questions = parsed?.questions?.filter(Boolean).slice(0, 12) ?? fallback;

      const fallbackUsage = estimateUsageFromText(idea, text);
      const charge = await chargeTokensSafely({
        userId: user.id,
        usage: usage ?? fallbackUsage,
        model: agent.modelId
      });
      if (!charge.charged && charge.reason === "insufficient_balance") {
        return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
      }

      return Response.json({ questions });
    } catch {
      // RouterAI не настроен/временно недоступен — не ломаем UX
      return Response.json({ questions: fallback, fallback: true });
    }
  }

  if (body?.mode === "compose") {
    const agent = resolveAgentForTask({
      plan: user.plan,
      projectKind: isProjectKind(body?.projectKind) ? body.projectKind : undefined,
      task: "prompt-compose",
      hint: body?.agentHint
    });

    const qa = body?.qa ?? [];
    const packed = qa
      .filter((x) => x.q && x.a)
      .map((x) => `Q: ${x.q}\nA: ${x.a}`)
      .join("\n\n");

    const composePrompt = `Ты — senior prompt engineer для генерации HTML-интерфейса в Lemnity (см. конверт ai-manus: один результат, чёткий формат).
Собери финальный ПРОМПТ для AI-генератора (один HTML, встроенные стили / Tailwind CDN, читаемая структура).
Формат:
- 1) Короткий заголовок проекта
- 2) Ясные требования к дизайну/структуре/контенту
- 3) Список секций или слайдов (в порядке) — в соответствии с типом проекта, если задан
- 4) Важные детали (CTA, интеграции, тон, печать/экран)
Верни только текст промпта, без префиксов и объяснений.${kindCtx}`;

    try {
      const { text, usage } = await requestRouterAIJson({
        prompt: `${composePrompt}\n\nИдея:\n${idea}\n\nОтветы пользователя:\n${packed}`,
        model: agent.modelId,
        settings: agent.settings.json,
        user: user.id
      });

      const finalPrompt = text.trim() || `${idea}\n\n${packed}`;

      const fallbackUsage = estimateUsageFromText(`${idea}\n${packed}`, finalPrompt);
      const charge = await chargeTokensSafely({
        userId: user.id,
        usage: usage ?? fallbackUsage,
        model: agent.modelId
      });
      if (!charge.charged && charge.reason === "insufficient_balance") {
        return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
      }

      return Response.json({ finalPrompt });
    } catch {
      const finalPrompt = [
        `Проект: ${idea}`,
        "",
        "Требования:",
        "- Next.js + Tailwind",
        "- Светлая тема, аккуратная типографика, rounded-2xl/3xl",
        "- Секции: hero, преимущества, кейсы/отзывы, тарифы, FAQ, контакты, форма заявки",
        "",
        "Детали:",
        "- Чёткий CTA, понятная навигация",
        "- Добавить место под интеграции (Telegram/CRM) в будущем",
        "",
        "Контекст (ответы пользователя):",
        packed || "—"
      ].join("\n");
      return Response.json({ finalPrompt, fallback: true });
    }
  }

  return new Response("mode must be questions|compose", { status: 400 });
}

export const POST = withApiLogging("/api/prompt-builder", postPromptBuilder);

