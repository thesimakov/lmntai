/**
 * Слой согласования с ai-manus (Simpleyyt/ai-manus):
 * - `backend/.../prompts/planner.py` — план: goal, title, language, steps[{ id, description }]
 * - `backend/.../prompts/execution.py` — исполнение шага, язык из сообщения пользователя
 * - `backend/.../prompts/system.py` — песочница, инструменты, правила письма
 *
 * Здесь: типы плана (для API/логов) + единый «конверт» для одношаговой HTML-генерации в RouterAI
 * (у нас нет plan-act агента, но структура требований к результату тем же осям: язык, формат, секции).
 */

/** Шаг плана, как в CreatePlanResponse (ai-manus planner). */
export type ManusPlanStep = {
  id: string;
  description: string;
};

/** Заголовок плана (совместим с JSON-планов агента). */
export type ManusPlanOutline = {
  message?: string;
  language: string;
  goal: string;
  title: string;
  steps: ManusPlanStep[];
};

/**
 * Вид доставляемого UI в превью Lemnity.
 * Должен совпадать с выбором в Playground / лендинге.
 */
export const PROJECT_KINDS = [
  "website",
  "presentation",
  "resume",
  "design",
  "visitcard"
] as const;

export type ProjectKind = (typeof PROJECT_KINDS)[number];

function detectWorkingLanguage(text: string): "ru" | "en" {
  const cyr = /[\u0400-\u04FF]/.test(text);
  return cyr ? "ru" : "en";
}

/**
 * Собирает итоговый текст для RouterAI: сначала конверт (язык, формат, секции), затем запрос пользователя.
 * Сохраняет совместимость: если `projectKind` нет, только язык + общий веб-UI.
 */
export function buildRouterGenerationPrompt(userPrompt: string, projectKind?: ProjectKind | null): string {
  const trimmed = userPrompt.trim();
  const lang = detectWorkingLanguage(trimmed);
  const kind = projectKind && PROJECT_KINDS.includes(projectKind) ? projectKind : null;

  const baseHeader = [
    "You are a UI generation assistant for the Lemnity preview (single HTML, Tailwind-friendly CSS).",
    `Working language for visible copy: **${lang === "ru" ? "Russian" : "English"}** (match the user's language in headings and body).`,
    "Output: one complete HTML5 document, embedded CSS (or Tailwind CDN), no external JS frameworks unless a tiny inline script is required.",
    "Accessibility: logical heading order, button/link labels, sufficient contrast."
  ];

  const formatBlock = (() => {
    switch (kind) {
      case "website":
        return [
          "Deliverable: **Marketing / product website** (scrolling page).",
          "Structure: header/nav, hero, value props, social proof or logos strip, feature grid, pricing or CTA block, FAQ, footer with contact + legal placeholder.",
          "Use sections with clear `id` or `data-section` for anchor nav."
        ];
      case "presentation":
        return [
          "Deliverable: **Slide-style page** (present as full-viewport “slides” in one HTML file).",
          "Layout: 5–8 sections, each is one “slide” — use `data-slide=\"n\"` on a wrapper, min-height ~100vh or large blocks, one main idea per slide, large title, bullets sparingly.",
          "Optional: light keyboard hint in comments; progress dots or page numbers in footer of each slide.",
          "No speaker notes panel unless asked — focus on on-screen design."
        ];
      case "resume":
        return [
          "Deliverable: **One-page resume / CV** in HTML (printable).",
          "Structure: top name + title + contact row; then Experience (reverse chrono), Education, Skills, optional Projects, Languages.",
          "Add `@media print` rules: A4 width, break-inside: avoid for sections, page-break-after sparingly.",
          "Professional typography, scannable, no stock Lorem in headings."
        ];
      case "design":
        return [
          "Deliverable: **UI/UX design concept** page (design system / component gallery).",
          "Include: color tokens, typography scale, button/input/card variants, empty and error states, spacing scale notes in comments.",
          "Layout as a “story” page or split columns; emphasize hierarchy and component reuse, not final marketing copy."
        ];
      case "visitcard":
        return [
          "Deliverable: **Digital business card** — compact single screen, centered card layout.",
          "Content: name, role, 1–2 line bio, contact links (as buttons), optional QR placeholder (styled box), messengers as icon-like buttons.",
          "Maximize clarity on mobile width first; subtle shadow / rounded card on subtle background."
        ];
      default:
        return [
          "Deliverable: **Landing / web interface** as appropriate to the user request.",
          "Prefer a clear hero, scannable sections, and one primary CTA."
        ];
    }
  })();

  return [
    baseHeader.join("\n"),
    "",
    "Format & structure:",
    ...formatBlock.map((l) => `- ${l}`),
    "",
    "---",
    "User request (follow intent; if conflict, user intent wins over generic templates):",
    "",
    trimmed
  ].join("\n");
}

export function isProjectKind(s: string | null | undefined): s is ProjectKind {
  return s != null && (PROJECT_KINDS as readonly string[]).includes(s);
}

/** Краткий контекст для /api/prompt-builder (вопросы + compose) — согласовать с типом, как план/goal в ai-manus. */
export function getProjectKindPromptBuilderContextRu(kind?: ProjectKind | null): string {
  if (!kind) return "";
  const m: Record<ProjectKind, string> = {
    website:
      "маркетинговый/продуктовый сайт: страница с секциями, навигация, hero, CTA, контакты.",
    presentation:
      "презентация в виде полноэкранных слайдов в одном HTML, по одной мысли на слайд.",
    resume: "одностраничное резюме/ CV, печатная вёрстка, опыт, навыки, контакты.",
    design: "UI/UX-концепт, дизайн-система, варианты компонентов и состояний.",
    visitcard: "цифровая визитка, компактный экран, контакты и ссылки."
  };
  return `\n\nТип результата (зафиксировано пользователем): ${m[kind]} Формулируй вопросы и итоговый промпт под этот тип, а не «универсальный сайт», если оно иное.`;
}
