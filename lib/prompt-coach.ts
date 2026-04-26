import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";

export type PromptCoachPhase = "gathering" | "confirm";

export type PromptCoachModelJson = {
  reply: string;
  phase: PromptCoachPhase;
  technical_prompt: string | null;
};

export function buildPromptCoachSystemPrompt(kindCtx: string, ideaHint: string): string {
  const ideaBlock = ideaHint.trim()
    ? `\nИсходная формулировка (контекст, может дублировать первое сообщение):\n${ideaHint.trim()}\n`
    : "";

  return `Ты — AI-коуч по сборке технического промпта для Lemnity Builder.
${kindCtx}
${ideaBlock}
Формат результата по умолчанию: **многофайловый React+TypeScript** (как в Vite-репозитории: \`src/main.tsx\`, \`src/App.tsx\`, при необходимости \`src/components/*\`, \`lib\`) — **не** один монолитный HTML, если тип проекта не «резюме»/«презентация» и пользователь не просит явно «один файл html».
Правила:
- Для веб-UI (не резюме/презентация): в финальном technical_prompt при необходимости картинок опиши использование рабочих HTTPS-ссылок — \`picsum.photos/seed/...\` или \`images.unsplash.com\` с подписью фотографа; не оставляй абстрактных «стоков без URL».
- Пока не хватает данных: phase="gathering", technical_prompt=null. В reply — 1–3 коротких уточняющих вопроса или просьба конкретизировать (без длинного финального ТЗ).
- Когда информации достаточно: phase="confirm", technical_prompt — полный технический промпт на русском для генератора: структура **файлов/компонентов**, экраны/секции, стиль, контент, CTA, языки, ограничения (для презентации/резюме — структура слайдов/блоков документа).
- В reply при phase="confirm" кратко объясни пользователю, что будет сделано, приведи сформулированное ТЗ; ОБЯЗАТЕЛЬНО заверши ответ ровно двумя переносами строки и фразой: «Всё верно? Запускать?» (с буквой «ё»).
Ответь СТРОГО одним JSON без markdown и без текста вокруг:
{"reply":"...","phase":"gathering"|"confirm","technical_prompt":null|"..."}`;
}

export function stripMarkdownJsonFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  }
  return t.trim();
}

const CONFIRM_SUFFIX = "\n\nВсё верно? Запускать?";

export function parsePromptCoachJson(text: string): PromptCoachModelJson | null {
  const raw = stripMarkdownJsonFence(text);
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const replyRaw = typeof j.reply === "string" ? j.reply.trim() : "";
    if (!replyRaw) return null;
    const phase: PromptCoachPhase = j.phase === "confirm" ? "confirm" : "gathering";
    const tp = j.technical_prompt;
    let technical_prompt: string | null = null;
    if (typeof tp === "string" && tp.trim()) {
      technical_prompt = tp.trim();
    } else if (tp !== null && tp !== undefined) {
      return null;
    }
    if (phase === "confirm" && !technical_prompt) return null;
    if (phase === "gathering") {
      technical_prompt = null;
    }

    let reply = replyRaw;
    if (phase === "confirm" && !reply.includes("Запускать?")) {
      reply = `${reply.replace(/\s+$/, "")}${CONFIRM_SUFFIX}`;
    }

    return { reply, phase, technical_prompt };
  } catch {
    return null;
  }
}

export function coachOfflineDemoReply(
  messages: Array<{ role: string; content: string }>,
  projectKind: ProjectKind | null
): PromptCoachModelJson {
  const lastUser = [...messages].reverse().find((m) => m.role === "user" && m.content?.trim());
  const seed = lastUser?.content?.trim() ?? "лендинг";
  const kindLabel =
    projectKind === "presentation"
      ? "презентация как документ (целевые форматы PPTX/PDF; в HTML — редактируемые слайды, без лендинговой шапки)"
      : projectKind === "resume"
        ? "резюме как документ (целевые форматы DOCX/PDF; в HTML — печатная вёрстка CV: контакты, опыт, навыки, образование)"
        : "веб-интерфейс (React+TypeScript, несколько файлов в src/ как в репозитории)";

  const stackLine =
    projectKind === "presentation" || projectKind === "resume"
      ? "Формат превью: один HTML-документ под тип задачи, Tailwind CDN при необходимости."
      : "Стек: Vite/Lovable-стиль — вывод: несколько файлов в markdown-огородах с путями `tsx:src/...` / `ts:src/...`; Tailwind через className; вход: `src/main.tsx` + `src/App.tsx`; крупные секции — в `src/components/`. Сборка превью — esbuild на платформе.";

  const technical_prompt = [
    `Тип: ${kindLabel}.`,
    `Задача (из запроса пользователя): ${seed}`,
    stackLine,
    projectKind === "presentation" || projectKind === "resume"
      ? "Не смешивать с маркетинговым лендингом (hero + прайс), если пользователь не просил."
      : "Добавить форму заявки (имя, email, сообщение) и блок FAQ из 4 пунктов — как отдельные компоненты или секции в App, не один длинный HTML.",
    "Язык интерфейса: русский."
  ].join("\n");

  return {
    reply: [
      "В офлайн-демо я собрал черновик технического промпта по вашему последнему сообщению.",
      "",
      technical_prompt,
      "",
      "Всё верно? Запускать?"
    ].join("\n"),
    phase: "confirm",
    technical_prompt
  };
}
