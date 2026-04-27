import { PROMPT_SITE_FOOTER_RULES_EN } from "@/lib/prompt-site-footer";
import { PROMPT_STOCK_IMAGES_RULES_EN } from "@/lib/prompt-stock-images";

/**
 * Спецификация промптов Lemnity AI (builder): план, шаги, форматы UI.
 * Совместима с контрактом upstream-планировщика (goal, title, language, steps).
 *
 * Здесь: типы плана + «конверт» для RouterAI: по умолчанию **многофайловый React+TS (Vite/Lovable)**, HTML-документ — для резюме/презентаций и т.д.
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
function isMultifileViteOutput(kind: ProjectKind | null): boolean {
  if (kind == null) return true;
  if (kind === "presentation" || kind === "resume") return false;
  return true;
}

/** Превью через esbuild (многофайловый React); иначе — монолитный HTML. */
export function shouldUseLovableBundler(projectKind?: ProjectKind | null): boolean {
  if (projectKind === "resume" || projectKind === "presentation") return false;
  return true;
}

export function buildRouterGenerationPrompt(
  userPrompt: string,
  projectKind?: ProjectKind | null,
  /** Стартовые файлы + правила с БД; агент правит по запросу, а не пишет с нуля */
  buildTemplateBlock?: string | null
): string {
  const trimmed = userPrompt.trim();
  const lang = detectWorkingLanguage(trimmed);
  const kind = projectKind && PROJECT_KINDS.includes(projectKind) ? projectKind : null;

  const multifile = isMultifileViteOutput(kind);

  const baseHeader = [
    "You are a document/UI generation assistant for Lemnity.",
    `Working language for visible copy: **${lang === "ru" ? "Russian" : "English"}** (match the user's language in headings and body).`,
    "The user sees a **live app preview** built from a small **file tree** (typical: `src/main.tsx`, `src/App.tsx`, optional `src/components/`, `lib/` as needed) — not a monolithic string export. **Resume and presentation** workstreams are the exception: they target real office documents (HTML preview as document/storyboard), not a React app layout.",
    multifile
      ? "Output for this mode: a **Vite/Lovable-style** React+TypeScript project as **multiple files** in markdown fences (not one big static HTML). The platform will bundle with esbuild; Tailwind is applied via CDN in the preview — use `className` and Tailwind utility classes only. Use functional components, `import` between files with **relative** paths, entry at `src/main.tsx` (createRoot on `#root`). Prefer splitting UI into `src/components/*.tsx` and shared bits under `lib/` or `src/lib/` when it keeps files readable. No `vite.config` in output unless asked — do not paste an entire `package.json` tree unless a file is required. **Strict:** each file must be ` ```tsx:path/to/File.tsx` or ` ```ts:path/to/file.ts` on the opening fence line (path after colon), then the file body, then closing fence. Include `src/main.tsx` and at least `src/App.tsx`."
      : "Output: one complete HTML5 document (editable preview for document workstreams), embedded CSS (or Tailwind CDN), no React app unless the user explicitly asked for a component tree.",
    "Treat generation as a compact mini-spec: GOAL, routes/screens, data/roles constraints, UX tone, visual constraints, measurable checks.",
    "Baseline quality: mobile-first, explicit loading/empty/error states where relevant, semantic headings/labels, and no secrets/keys in visible code.",
    "Accessibility: logical heading order, button/link labels, sufficient contrast.",
    PROMPT_STOCK_IMAGES_RULES_EN,
    PROMPT_SITE_FOOTER_RULES_EN
  ];

  const formatBlock = (() => {
    switch (kind) {
      case "website":
        return [
          "Deliverable: **Marketing / product website** as a **React+TS** app (same structure as a real repo: `src/App.tsx` composes sections; extract repeated blocks to `src/components/…`).",
          "Structure: header/nav, hero, value props, social proof, feature grid, pricing or CTA block, FAQ, footer — implemented as components/sections, not one giant return.",
          "Use semantic sections with clear `id` or `data-section` for anchor nav.",
          "Apply the global stock-image URL rules (prefer Wikimedia Commons direct URLs + credit; otherwise Picsum seed or Unsplash + credit) for any photos in the layout.",
          "Apply the global site-footer bar rules (copyright + privacy placeholder left; build date + «Сделано на Lemnity» right)."
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
          "Deliverable: **UI/UX design concept** in React+TS: design system / component gallery as real components (e.g. `src/components/ui/`).",
          "Include: color tokens, typography scale, button/input/card variants, empty and error states; spacing notes in comments.",
          "Compose in `App.tsx` or a `src/pages/DesignSystem.tsx` story layout; emphasize hierarchy and reuse, not a marketing one-pager.",
          "For sample imagery in cards/hero mockups, follow the global stock-image URL rules (Commons / Picsum / Unsplash + credit)."
        ];
      case "visitcard":
        return [
          "Deliverable: **Digital business card** — one compact screen in `App.tsx` (or `src/Visitcard.tsx`), centered card layout.",
          "Content: name, role, 1–2 line bio, contact links (as buttons), optional QR placeholder, messengers as icon-like buttons.",
          "Maximize clarity on mobile width first; subtle shadow / rounded card on subtle background."
        ];
      case "lovable":
        return [
          "Deliverable: **Web app in React + TypeScript** (Lovable-style): component tree, `src/main.tsx` + `src/App.tsx` + extra modules as needed.",
          "Styling: Tailwind utility `className` only (preview injects Tailwind CDN).",
          "Split UI into small files under `src/`; use relative imports; export components as `export function` or `export default` consistently.",
          "State: `useState` / light logic only — no real backend; mock data in-module if needed.",
          "NPM imports: the preview bundler only resolves **installed** packages. Prefer `react` / `react-dom` only; if needed use: `react-router-dom`, `date-fns`, `lucide-react` or `react-icons`, `framer-motion`, `axios`, `zod`, `@tanstack/react-query`, `swiper`, `embla-carousel-react`, `recharts`, `clsx`, `tailwind-merge`, `react-hook-form`, `sonner`, or `@radix-ui/*` (match an existing import path). Avoid random or native-only libraries.",
          "Include resilient states for interactive blocks: loading/empty/error placeholders.",
          "If the request implies tariffs/roles (FREE/PRO/etc.), reflect feature gating in UI copy and section visibility cues.",
          "For any photos/illustrations in the UI, follow the global stock-image URL rules.",
          "Include the site footer bar (copyright + privacy placeholder; build date + Lemnity link) when the app has a footer."
        ];
      default:
        return [
          "Deliverable: **Landing or web interface** as a **multi-file** React+TS app (Vite/Lovable style) unless the user asked only for a static one-file HTML.",
          "Prefer: `src/main.tsx` + `src/App.tsx` + `src/components/*`; split sections logically; one primary CTA; responsive layout (mobile-first) via Tailwind `className`.",
          "For data-like UI sections, include loading/empty/error states.",
          "If you add a page footer, follow the global site-footer rules (Lemnity link, build date, privacy placeholder)."
        ];
    }
  })();

  const templateSection =
    buildTemplateBlock && buildTemplateBlock.trim().length > 0
      ? [
          "",
          "---",
          "BUILD TEMPLATE: start from the following repo snapshot — **edit** these files to match the user. Output updated full files in fences; keep paths stable unless refactor is required.",
          buildTemplateBlock.trim(),
        ]
      : [];

  return [
    baseHeader.join("\n"),
    "",
    "Format & structure:",
    ...formatBlock.map((l) => `- ${l}`),
    ...templateSection,
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
      "маркетинговый/продуктовый сайт в виде **React+TypeScript-проекта** (несколько файлов в `src/`, как в Vite-репозитории): компоненты, секции, навигация, hero, CTA — не один монолитный HTML. **Картинки:** по возможности прямые URL **Wikimedia Commons** — `https://upload.wikimedia.org/wikipedia/commons/...` с короткой подписью (название файла / ссылка на страницу файла); при необходимости — `https://picsum.photos/seed/<латиница>/ширина/высота` или `https://images.unsplash.com/...` с подписью фотографа. **Футер:** нижняя полоса с `footer-bottom`: слева © и «Политика конфиденциальности» (пока `href=\"#\"`, URL позже); справа дата сборки и ссылка «Сделано на Lemnity» → `https://lemnity.com`.",
    presentation:
      "презентация как документ: целевые форматы PPTX/PDF; в HTML — редактируемые полноэкранные слайды по одной мысли.",
    resume:
      "резюме как документ: целевые форматы DOCX/PDF; в HTML — редактируемая печатная вёрстка CV, не лендинг.",
    design:
      "UI/UX-концепт, дизайн-система, варианты компонентов и состояний. Для примеров картинок в макетах — те же правила URL, что для сайта (Commons / Picsum / Unsplash + подпись).",
    visitcard:
      "цифровая визитка, компактный экран, контакты и ссылки. Фон/фото при необходимости — Commons / Picsum / Unsplash с подписью.",
    lovable:
      "веб-приложение в стиле Lovable: React+TypeScript, несколько файлов в `src/`, Tailwind, превью как у современного AI-билдера. Иллюстрации в UI — стабильные URL (Commons / Picsum / Unsplash), не выдуманные домены. При футере — та же схема, что для сайта (политика слева/по макету, справа дата сборки и Lemnity)."
  };
  return `\n\nТип результата (зафиксировано пользователем): ${m[kind]} Формулируй вопросы и итоговый промпт под этот тип, а не «универсальный сайт», если оно иное.`;
}
