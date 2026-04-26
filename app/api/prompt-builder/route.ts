import type { NextRequest } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { requireDbUser } from "@/lib/auth-guards";
import { resolveAgentForTask } from "@/lib/agent-models";
import { isLemnityAiBridgeEnabledServer } from "@/lib/lemnity-ai-bridge-config";
import { buildPromptModelFallbackChain } from "@/lib/prompt-model-fallback";
import { requestRouterAIJsonWithFallback } from "@/lib/routerai-client";
import { chargeTokensSafely, estimateUsageFromText, normalizeUsage } from "@/lib/token-billing";
import { getEffectivePromptBuilderMinimum } from "@/lib/platform-plan-settings";
import { hasEnoughTokens } from "@/lib/token-manager";
import {
  getProjectKindPromptBuilderContextRu,
  isProjectKind,
  shouldUseLovableBundler,
  type ProjectKind
} from "@/lib/lemnity-ai-prompt-spec";
import { withApiLogging } from "@/lib/with-api-logging";

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function composePromptBuilderOfflineDemo(idea: string, packed: string, multifile: boolean): string {
  if (!multifile) {
    return [
      `Проект: ${idea}`,
      "",
      "Требования (документ/превью в одном HTML по типу, Tailwind при необходимости):",
      "- Структура согласно уточнениям; читаемая типографика, светлая или заданная тема",
      "",
      "Контекст (ответы пользователя):",
      packed || "—"
    ].join("\n");
  }
  return [
    `Проект: ${idea}`,
    "",
    "Требования (как в репозитории Vite+React+TS, не один монолитный index.html):",
    "- main: `src/main.tsx`, корень: `src/App.tsx`, секции/повторы — `src/components/*.tsx`, утилиты — `src/lib/` или `lib/`",
    "- Tailwind через `className` (в превью подключён CDN), мобайл-first",
    "- Секции: hero, преимущества, кейсы/отзывы, тарифы, FAQ, контакты, форма заявки — из компонентов",
    "",
    "Детали:",
    "- Чёткий CTA, понятная навигация; место под будущие интеграции (Telegram/CRM) в копей или форме",
    "",
    "Контекст (ответы пользователя):",
    packed || "—"
  ].join("\n");
}

function getPromptBuilderFallbackQuestions(): string[] {
  return [
    "Какой тип сайта нужен (лендинг/мультистраничный/магазин)?",
    "Какая основная цель сайта (лиды/продажи/бренд/запись)?",
    "Кто целевая аудитория и география?",
    "Какой стиль и референсы нравятся (минимализм/неон/премиум)?",
    "Какие блоки должны быть на главной (герой, тарифы, отзывы, FAQ)?",
    "Какой главный оффер и призыв к действию?",
    "Нужны ли интеграции (Telegram, CRM, платежи)?",
    "Язык и тон: официальный/дружелюбный/дерзкий?"
  ];
}

async function postPromptBuilder(req: NextRequest) {
  if (isLemnityAiBridgeEnabledServer()) {
    return new Response("Legacy /api/prompt-builder disabled in Lemnity AI bridge mode. Use /api/lemnity-ai/sessions/:id/chat", {
      status: 410
    });
  }

  try {
  const body = (await req.json().catch(() => null)) as
    | {
        mode?: "questions" | "compose";
        idea?: string;
        qa?: Array<{ q: string; a: string }>;
        projectKind?: string;
        agentHint?: string;
      }
    | null;

  const session = await getSafeServerSession();
  const guard = await requireDbUser();

  if (!guard.ok) {
    if (
      guard.status === 503 &&
      session?.user?.demoOffline &&
      process.env.NODE_ENV === "development"
    ) {
      const ideaEarly = body?.idea?.trim();
      if (!ideaEarly) return new Response("idea is required", { status: 400 });
      if (body?.mode === "questions") {
        return Response.json({ questions: getPromptBuilderFallbackQuestions(), fallback: true, noDb: true });
      }
      if (body?.mode === "compose") {
        const qa = body?.qa ?? [];
        const packed = qa
          .filter((x) => x.q && x.a)
          .map((x) => `Q: ${x.q}\nA: ${x.a}`)
          .join("\n\n");
        const pkEarly = isProjectKind(body?.projectKind) ? (body.projectKind as ProjectKind) : null;
        return Response.json({
          finalPrompt: composePromptBuilderOfflineDemo(ideaEarly, packed, shouldUseLovableBundler(pkEarly)),
          fallback: true,
          noDb: true
        });
      }
      return new Response("mode must be questions|compose", { status: 400 });
    }
    return new Response(guard.message, { status: guard.status });
  }

  const user = guard.data.user;
  const minPromptBalance = await getEffectivePromptBuilderMinimum(user.plan);
  if (!hasEnoughTokens(user, minPromptBalance)) {
    return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
  }

  const idea = body?.idea?.trim();
  if (!idea) return new Response("idea is required", { status: 400 });
  const kindCtx = isProjectKind(body?.projectKind)
    ? getProjectKindPromptBuilderContextRu(body.projectKind)
    : "";
  const pkResolved: ProjectKind | null = isProjectKind(body?.projectKind) ? body.projectKind : null;
  const multifile = shouldUseLovableBundler(pkResolved);
  const resultModeHint = multifile
    ? "Типичный артефакт: **многофайловый** React+TypeScript (папки `src/`, `src/components/`), превью как у Vite — не один монолитный HTML."
    : "Артефакт по типу проекта: для презентации/резюме — структура и HTML-превью под документ, не веб-приложение в нескольких tsx, если не оговорено иное.";

  if (body?.mode === "questions") {
    const agent = resolveAgentForTask({
      plan: user.plan,
      projectKind: isProjectKind(body?.projectKind) ? body.projectKind : undefined,
      task: "prompt-questions",
      hint: body?.agentHint
    });

    const systemPrompt = `Ты — продакт/UX-стратег для генерации интерфейса в Lemnity (Lemnity AI builder).
${resultModeHint}
Сгенерируй 6–9 уточняющих вопросов, чтобы собрать промпт для AI-генератора.
Требования:
- вопросы короткие и конкретные; учитывай заданный тип доставляемого результата, если он указан
- покрыть: цель, аудиторию, стиль, структуру блоков/слайдов/секций резюме, CTA, цвет/тон, контент/языки, интеграции${multifile ? "; при многофайловом — какие крупные компоненты/экраны выделить" : ""}
- верни только JSON без текста вокруг:
{ "questions": ["...","..."] }`;

    const fallback = getPromptBuilderFallbackQuestions();

    try {
      const modelChain = buildPromptModelFallbackChain(agent.modelId);
      const res = await requestRouterAIJsonWithFallback(
        {
          prompt: `${systemPrompt}${kindCtx}\n\nИдея пользователя:\n${idea}`,
          settings: agent.settings.json,
          user: user.id
        },
        modelChain
      );
      const text = res.text;
      const usage = res.usage;
      const billedModel = res.model ?? res.requestedModel ?? agent.modelId;
      const debugAttempted = modelChain;

      const parsed = safeJsonParse<{ questions: string[] }>(text);
      const questions = parsed?.questions?.filter(Boolean).slice(0, 12) ?? fallback;

      const fallbackUsage = estimateUsageFromText(idea, text);
      const charge = await chargeTokensSafely({
        userId: user.id,
        usage: usage ?? fallbackUsage,
        model: billedModel
      });
      if (!charge.charged && charge.reason === "insufficient_balance") {
        return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
      }

      return Response.json({
        questions,
        ...(process.env.NODE_ENV === "production"
          ? {}
          : {
              debug_model: billedModel,
              debug_attempted_models: debugAttempted
            })
      });
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

    const composePrompt = multifile
      ? `Ты — senior prompt engineer для **многофайлового** React+TypeScript UI в Lemnity (Vite-стиль: \`src/main.tsx\`, \`src/App.tsx\`, \`src/components/*\` — как в настоящем репозитории; превью собирает платформа, Tailwind в className).
Собери финальный ПРОМПТ для AI-генератора: иерархия **файлов/компонентов**, макет, контент, CTA, адаптив, язык.
Формат ответа:
- 1) Заголовок проекта
- 2) Требования к дизайну (цвет, типографика, брейкпоинты)
- 3) Список файлов/основных компонентов и что в каждом
- 4) Порядок секций/экранов в App
- 5) CTA, интеграции, тон, ограничения
- 6) Если нужны фото/hero/карточки с картинками: явно укажи стабильные URL — \`https://picsum.photos/seed/<латиница>/ширина/высота\` и/или \`https://images.unsplash.com/...\` с короткой подписью автора (имя + ссылка на Unsplash). Не выдумывай несуществующие хосты картинок.
Верни только текст промпта, без префиксов и объяснений.${kindCtx}`
      : `Ты — senior prompt engineer для генерации **HTML-интерфейса/документа** в Lemnity (превью в одном HTML там, где это тип проекта: слайды, резюме и т.д.).
Собери финальный ПРОМПТ: структура, стили, контент, экспорт, язык.
Формат: заголовок; требования; порядок блоков/слайдов; детали.
Верни только текст промпта.${kindCtx}`;

    try {
      const modelChain = buildPromptModelFallbackChain(agent.modelId);
      const res = await requestRouterAIJsonWithFallback(
        {
          prompt: `${composePrompt}\n\nИдея:\n${idea}\n\nОтветы пользователя:\n${packed}`,
          settings: agent.settings.json,
          user: user.id
        },
        modelChain
      );
      const text = res.text;
      const usage = res.usage;
      const billedModel = res.model ?? res.requestedModel ?? agent.modelId;
      const debugAttempted = modelChain;

      const finalPrompt = text.trim() || `${idea}\n\n${packed}`;

      const fallbackUsage = estimateUsageFromText(`${idea}\n${packed}`, finalPrompt);
      const charge = await chargeTokensSafely({
        userId: user.id,
        usage: usage ?? fallbackUsage,
        model: billedModel
      });
      if (!charge.charged && charge.reason === "insufficient_balance") {
        return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
      }

      const usageOut = normalizeUsage(usage ?? fallbackUsage);
      return Response.json({
        finalPrompt,
        usage: usageOut,
        ...(process.env.NODE_ENV === "production"
          ? {}
          : {
              debug_model: billedModel,
              debug_attempted_models: debugAttempted
            })
      });
    } catch {
      const demoText = composePromptBuilderOfflineDemo(idea, packed, multifile);
      return Response.json({
        finalPrompt: demoText,
        usage: normalizeUsage(estimateUsageFromText(`${idea}\n${packed}`, demoText)),
        fallback: true
      });
    }
  }

  return new Response("mode must be questions|compose", { status: 400 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[api/prompt-builder]", err);
    return Response.json({ error: detail.slice(0, 500) }, { status: 500 });
  }
}

export const POST = withApiLogging("/api/prompt-builder", postPromptBuilder);

