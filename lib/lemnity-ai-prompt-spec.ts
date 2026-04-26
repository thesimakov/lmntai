/**
 * Спецификация промптов Lemnity AI (builder): план, шаги, форматы UI.
 * Совместима с контрактом upstream-планировщика (goal, title, language, steps).
 *
 * Здесь: типы плана + единый «конверт» для одношаговой HTML-генерации в RouterAI.
 */

/** Шаг плана (ответ планировщика). */
export type LemnityAiPlanStep = {
  id: string;
  description: string;
};

/** Заголовок плана (совместим с JSON-планов агента). */
export type LemnityAiPlanOutline = {
  message?: string;
  language: string;
  goal: string;
  title: string;
  steps: LemnityAiPlanStep[];
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
  "visitcard",
  /** React + Vite-стек (как lovable.dev): многофайловый TSX, превью через сборку. */
  "lovable"
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
    "You are a document/UI generation assistant for Lemnity.",
    `Working language for visible copy: **${lang === "ru" ? "Russian" : "English"}** (match the user's language in headings and body).`,
    "The user edits in a live HTML preview, but **resume and presentation workstreams target real office documents**, not marketing websites: structure content so Word/PDF or PowerPoint/PDF exports stay professional.",
    kind === "lovable"
      ? "Output for this mode: a **Lovable-style** React+TypeScript project as **multiple files** in markdown fences (not one big HTML). The platform will bundle with esbuild; Tailwind is applied via CDN in the preview — use `className` and Tailwind utility classes only. Use functional components, `import` between files with **relative** paths, entry at `src/main.tsx` (createRoot on `#root`). No `vite.config` in output unless asked — keep files under `src/`. **Strict:** each file must be ` ```tsx:src/...` or ` ```ts:src/...` on the opening fence line (path after colon), then the file body, then closing fence. Include `src/main.tsx` and at least `src/App.tsx`."
      : "Output: one complete HTML5 document, embedded CSS (or Tailwind CDN), no external JS frameworks unless a tiny inline script is required.",
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
          "Canonical deliverables: **PowerPoint (.pptx)** and **PDF** (Lemnity Pro/Team can download both when the deck is built on the document pipeline).",
          "This HTML preview is the **editable storyboard**: 5–8 slide sections, each wrapper with `data-slide=\"n\"`, min-height ~100vh or large blocks, one main idea per slide, big title, tight bullets — structure must map cleanly to slide titles/body in PPTX/PDF.",
          "Optional: keyboard hint in comments; slide numbers or progress dots in the footer.",
          "No marketing-site hero or pricing clichés unless the user asked for a pitch deck that needs them."
        ];
      case "resume":
        return [
          "Canonical deliverables: **Word (.docx)** and **PDF** — the user exports from Lemnity; HTML is the **editable document preview**, not a landing page.",
          "Structure like a real CV: header (name, role, contacts), Experience (reverse chrono), Education, Skills, optional Projects & Languages — no hero banners or startup-marketing sections.",
          "`@media print`: A4/Letter width, `break-inside: avoid` on sections, sensible page breaks.",
          "Professional typography, scannable, no fake Lorem in headings."
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
      case "lovable":
        return [
          "Deliverable: **Web app in React + TypeScript** (Lovable-style): component tree, `src/main.tsx` + `src/App.tsx` + extra modules as needed.",
          "Styling: Tailwind utility `className` only (preview injects Tailwind CDN).",
          "Split UI into small files under `src/`; use relative imports; export components as `export function` or `export default` consistently.",
          "State: `useState` / light logic only — no real backend; mock data in-module if needed."
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

/** Краткий контекст для /api/prompt-builder (вопросы + compose). */
export function getProjectKindPromptBuilderContextRu(kind?: ProjectKind | null): string {
  if (!kind) return "";
  const m: Record<ProjectKind, string> = {
    website:
      "маркетинговый/продуктовый сайт: страница с секциями, навигация, hero, CTA, контакты.",
    presentation:
      "презентация как документ: целевые форматы PPTX/PDF; в HTML — редактируемые полноэкранные слайды по одной мысли.",
    resume:
      "резюме как документ: целевые форматы DOCX/PDF; в HTML — редактируемая печатная вёрстка CV, не лендинг.",
    design: "UI/UX-концепт, дизайн-система, варианты компонентов и состояний.",
    visitcard: "цифровая визитка, компактный экран, контакты и ссылки.",
    lovable:
      "веб-приложение в стиле Lovable: React+TypeScript, несколько файлов в `src/`, Tailwind, превью как у современного AI-билдера."
  };
  return `\n\nТип результата (зафиксировано пользователем): ${m[kind]} Формулируй вопросы и итоговый промпт под этот тип, а не «универсальный сайт», если оно иное.`;
}
