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
- Для веб-UI (не резюме/презентация): в финальном technical_prompt при необходимости картинок опиши рабочие HTTPS-ссылки — по возможности \`https://upload.wikimedia.org/wikipedia/commons/...\` (Wikimedia Commons) с подписью-атрибуцией; иначе \`picsum.photos/seed/...\` или \`images.unsplash.com\` с подписью фотографа; не оставляй абстрактных «стоков без URL».
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

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1).trim();
      }
    }
  }
  return null;
}

const MIN_DERIVED_TECHNICAL_PROMPT_LEN = 60;

function normalizeJsonLikeSlice(slice: string): string {
  return slice
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"');
}

function tryParseJsonObject(slice: string): Record<string, unknown> | null {
  const variants = [slice, normalizeJsonLikeSlice(slice)];
  for (const v of variants) {
    if (!v.trim()) continue;
    try {
      return JSON.parse(v) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}

function unwrapNestedCoachPayload(parsed: Record<string, unknown>): Record<string, unknown> {
  const hasFlat =
    parsed.reply !== undefined ||
    parsed.phase !== undefined ||
    parsed.technical_prompt !== undefined ||
    parsed.technicalPrompt !== undefined ||
    parsed.message !== undefined;
  if (hasFlat) return parsed;
  for (const key of ["data", "result", "output", "response"] as const) {
    const inner = parsed[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return unwrapNestedCoachPayload(inner as Record<string, unknown>);
    }
  }
  return parsed;
}

function pickCoachReply(p: Record<string, unknown>): unknown {
  if (p.reply !== undefined) return p.reply;
  const msg = p.message;
  if (typeof msg === "string") return msg;
  if (msg && typeof msg === "object" && !Array.isArray(msg)) {
    const inner = msg as Record<string, unknown>;
    const c = inner.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      const parts: string[] = [];
      for (const item of c) {
        if (typeof item === "string") parts.push(item);
        else if (item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string") {
          parts.push((item as { text: string }).text);
        }
      }
      const joined = parts.join("");
      if (joined) return joined;
    }
  }
  return p.answer ?? p.text;
}

function coerceCoachShape(parsed: Record<string, unknown>): Record<string, unknown> {
  const p = unwrapNestedCoachPayload(parsed);
  return {
    ...p,
    reply: pickCoachReply(p),
    phase: p.phase ?? p.stage ?? p.step,
    technical_prompt:
      p.technical_prompt ?? p.technicalPrompt ?? p.final_prompt ?? p.spec ?? p.prompt_technical
  };
}

function stripConfirmSuffixFromReply(reply: string): string {
  return reply.replace(/\n\nВсё верно\? Запускать\?\s*$/i, "").trim();
}

export function parsePromptCoachJson(text: string): PromptCoachModelJson | null {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  const raw = stripMarkdownJsonFence(cleaned);
  const normCleaned = normalizeJsonLikeSlice(cleaned);
  const normRaw = normalizeJsonLikeSlice(raw);

  const slices = [
    raw,
    normRaw,
    normCleaned,
    extractFirstJsonObject(raw) ?? "",
    extractFirstJsonObject(normRaw) ?? "",
    extractFirstJsonObject(cleaned) ?? "",
    extractFirstJsonObject(normCleaned) ?? ""
  ].filter((s) => s.trim().length > 0);

  let parsed: Record<string, unknown> | null = null;
  for (const slice of slices) {
    const p = tryParseJsonObject(slice);
    if (p) {
      parsed = coerceCoachShape(p);
      break;
    }
  }
  if (!parsed) return null;

  const replyRaw =
    typeof parsed.reply === "string"
      ? parsed.reply.trim()
      : parsed.reply != null
        ? String(parsed.reply).trim()
        : "";
  if (!replyRaw) return null;

  const phaseRaw = typeof parsed.phase === "string" ? parsed.phase.trim().toLowerCase() : "";
  const phase: PromptCoachPhase = phaseRaw === "confirm" ? "confirm" : "gathering";

  const tp = parsed.technical_prompt;
  let technical_prompt: string | null = null;
  if (typeof tp === "string" && tp.trim()) {
    technical_prompt = tp.trim();
  } else if (tp !== null && tp !== undefined) {
    try {
      const asJson = JSON.stringify(tp);
      technical_prompt = typeof asJson === "string" && asJson.trim() ? asJson : null;
    } catch {
      technical_prompt = null;
    }
  }

  if (phase === "gathering") {
    technical_prompt = null;
  } else if (phase === "confirm" && !technical_prompt) {
    const stripped = stripConfirmSuffixFromReply(replyRaw);
    const candidate =
      stripped.length >= MIN_DERIVED_TECHNICAL_PROMPT_LEN
        ? stripped
        : replyRaw.length >= MIN_DERIVED_TECHNICAL_PROMPT_LEN
          ? replyRaw.trim()
          : "";
    if (candidate) technical_prompt = candidate;
  }

  if (phase === "confirm" && !technical_prompt) return null;

  let reply = replyRaw;
  if (phase === "confirm" && !reply.includes("Запускать?")) {
    reply = `${reply.replace(/\s+$/, "")}${CONFIRM_SUFFIX}`;
  }
  return { reply, phase, technical_prompt };
}

export type CoachOfflineDemoIntroVariant = "offline_dev" | "router_error";

export function coachOfflineDemoReply(
  messages: Array<{ role: string; content: string }>,
  projectKind: ProjectKind | null,
  options?: { introVariant?: CoachOfflineDemoIntroVariant }
): PromptCoachModelJson {
  const intro =
    options?.introVariant === "router_error"
      ? "Сейчас не удалось получить ответ от модели. Ниже — черновик технического промпта по вашему последнему сообщению."
      : "В офлайн-демо я собрал черновик технического промпта по вашему последнему сообщению.";

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
      intro,
      "",
      technical_prompt,
      "",
      "Всё верно? Запускать?"
    ].join("\n"),
    phase: "confirm",
    technical_prompt
  };
}
