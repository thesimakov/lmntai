import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { withApiLogging } from "@/lib/with-api-logging";

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function postPromptBuilder(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return new Response("User not found", { status: 404 });

  const body = (await req.json().catch(() => null)) as
    | {
        mode?: "questions" | "compose";
        idea?: string;
        qa?: Array<{ q: string; a: string }>;
      }
    | null;

  const idea = body?.idea?.trim();
  if (!idea) return new Response("idea is required", { status: 400 });

  if (body?.mode === "questions") {
    const systemPrompt = `Ты — продакт/UX-стратег для генерации сайтов.
Сгенерируй 6–9 уточняющих вопросов пользователю, чтобы собрать идеальный промпт для AI-генератора сайта.
Требования:
- вопросы короткие и конкретные
- покрыть: цель, аудиторию, стиль, структуру блоков, офферы, CTA, цвет/тон, контент/языки, интеграции
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
        prompt: `${systemPrompt}\n\nИдея пользователя:\n${idea}`
      });

      const parsed = safeJsonParse<{ questions: string[] }>(text);
      const questions = parsed?.questions?.filter(Boolean).slice(0, 12) ?? fallback;

      if (usage) {
        await prisma.tokenUsageLog.create({
          data: {
            userId: user.id,
            promptTokens: usage.prompt_tokens ?? 0,
            completionTokens: usage.completion_tokens ?? 0,
            totalTokens: usage.total_tokens ?? 0,
            model: "gpt-4o-mini"
          }
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { tokenBalance: { decrement: usage.total_tokens ?? 0 } }
        });
      }

      return Response.json({ questions });
    } catch {
      // RouterAI не настроен/временно недоступен — не ломаем UX
      return Response.json({ questions: fallback, fallback: true });
    }
  }

  if (body?.mode === "compose") {
    const qa = body?.qa ?? [];
    const packed = qa
      .filter((x) => x.q && x.a)
      .map((x) => `Q: ${x.q}\nA: ${x.a}`)
      .join("\n\n");

    const composePrompt = `Ты — senior prompt engineer для генерации сайтов.
Собери финальный ПРОМПТ для AI-генератора (Next.js, Tailwind, компоненты, структура).
Формат:
- 1) Короткий заголовок проекта
- 2) Ясные требования к дизайну/структуре/контенту
- 3) Список секций страницы (в порядке)
- 4) Важные детали (CTA, интеграции, тон)
Верни только текст промпта, без префиксов и объяснений.`;

    try {
      const { text, usage } = await requestRouterAIJson({
        prompt: `${composePrompt}\n\nИдея:\n${idea}\n\nОтветы пользователя:\n${packed}`
      });

      const finalPrompt = text.trim() || `${idea}\n\n${packed}`;

      if (usage) {
        await prisma.tokenUsageLog.create({
          data: {
            userId: user.id,
            promptTokens: usage.prompt_tokens ?? 0,
            completionTokens: usage.completion_tokens ?? 0,
            totalTokens: usage.total_tokens ?? 0,
            model: "gpt-4o-mini"
          }
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { tokenBalance: { decrement: usage.total_tokens ?? 0 } }
        });
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

