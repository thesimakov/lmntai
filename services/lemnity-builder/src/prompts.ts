import { appLanguageInstruction, type AppUiLanguage } from "./ui-labels.js";

export type PlanStep = {
  id: string;
  description: string;
};

/** Keep in sync with `lib/prompt-stock-images.ts` → `PROMPT_STOCK_IMAGES_RULES_EN`. */
const STOCK_IMAGES_GUIDANCE =
  "Images (hero, sections, cards): use only real HTTPS `src` URLs. Prefer `https://upload.wikimedia.org/wikipedia/commons/...` (Wikimedia Commons) for editorial/photo placeholders — add a visible one-line credit (title + link to the file page on Commons). Alternatively `https://picsum.photos/seed/<short-ascii-seed>/<width>/<height>` or `https://images.unsplash.com/...` (with photographer credit) where appropriate. Do not use deprecated `source.unsplash.com`, `placehold.co` as default stock, broken `example.com` placeholders, or invented image hosts.";

/** Keep in sync with `lib/prompt-site-footer.ts` → `PROMPT_SITE_FOOTER_RULES_EN`. */
const SITE_FOOTER_GUIDANCE =
  "Marketing site footer: when you include `<footer>`, add `div.footer-bottom` with flex row: left — `© {year} {brand}`, rights text, «Политика конфиденциальности» with `href=\"#\"` (URL TBD comment); right — `Собрано:` + `new Date().toLocaleDateString(...)`, then «Сделано на Lemnity» → `https://lemnity.com` (new tab).";

/** Inspired by lovable.guide: keep prompts as compact, verifiable mini-TZ. */
const GOLDEN_PROMPT_FORMULA_GUIDANCE =
  "Plan and execute as a compact spec: define GOAL (for whom + outcome), ROUTES/SCREENS, DATA entities and access rules, ROLES (guest/user/admin etc.), UX tone, visual constraints, measurable constraints (performance/quality), and acceptance checks.";

const QUALITY_CHECKLIST_GUIDANCE =
  "Quality baseline for generated UI: mobile-first responsive layout; explicit loading/empty/error states for key flows; clear role-based visibility (feature gating in UI copy/structure); semantic headings/labels; avoid secrets/keys in code or visible text.";

/** Тип визуального артефакта — планировщик обязан выбрать по смыслу запроса, не по умолчанию. */
export type ArtifactKind =
  | "landing"
  | "presentation"
  | "resume"
  | "dashboard"
  | "web_app"
  | "documentation"
  | "ecommerce"
  | "portfolio"
  | "blog_or_multipage"
  | "other"
  /** React+TS, много файлов, превью как lovable.dev (esbuild на хосте). */
  | "lovable";

export type BuilderPlan = {
  message: string;
  language: string;
  goal: string;
  title: string;
  /** Семантический тип результата (не всегда лендинг). */
  artifact_kind: ArtifactKind;
  steps: PlanStep[];
};

export const LEMNITY_SYSTEM_PROMPT = [
  "You are Lemnity Builder, an AI agent embedded in the Lemnity platform.",
  "Your job is to turn the user's request into a polished artifact. **Default for most web UIs: a Vite-style React+TypeScript project** — **multiple** fenced files (`src/main.tsx`, `src/App.tsx`, optional `src/components/*`, `lib/`), bundled for preview (esbuild + Tailwind CDN) — not one monolithic HTML string. **Exception — presentation**: real .pptx + PDF from slide data. **Exception — resume/CV**: HTML as editable **document** preview (Word/PDF export).",
  "For **resume / CV**, treat the HTML as an **editable document preview**: the user's canonical exports are **Word (.docx)** and **PDF** — structure content as a print-ready CV, not a marketing website (no hero, no pricing blocks).",
  "You do not have a shell, browser automation, or external sandbox. Do not claim to run commands or inspect websites.",
  "You may plan work, show progress, and produce a complete artifact.",
  "CRITICAL: Infer the deliverable TYPE from the user's words. For **лендинг / landing / site / product page** prefer **lovable** or **landing** and produce **multi-file** TS/TSX unless the user explicitly asked for a single static HTML file. Examples: «Lovable», «как lovable», «react+vite», **«сайт»**, **«лендинг»** → lovable/landing (multi-file); «презентация», «pptx» → presentation; «резюме», «CV» → resume; «дашборд» → dashboard; «документация» → documentation; «магазин» → ecommerce; «портфолио» → portfolio; «приложение», «админка» (SPA UI) → web_app or lovable; «блог» → blog_or_multipage.",
  "Do NOT default to a SaaS marketing landing (hero + 3 features + pricing) as **one** HTML file unless the user asked for a single file.",
  "Visible copy in the generated UI must use the user's language.",
  "Prefer production-quality typography and semantic HTML/JSX; accessible labels; strong hierarchy; realistic content, no lorem ipsum unless asked.",
  "For **lovable/landing (multi-file)**: output ` ```tsx:src/...` / ` ```ts:src/...` fences. For **non-React** HTML-only previews (legacy dashboard/docs paths when truly one file is required): one self-contained HTML5 document; otherwise prefer the multi-file app format.",
  STOCK_IMAGES_GUIDANCE,
  SITE_FOOTER_GUIDANCE,
  GOLDEN_PROMPT_FORMULA_GUIDANCE,
  QUALITY_CHECKLIST_GUIDANCE
].join("\n");

const ARTIFACT_KIND_SET = new Set<string>([
  "landing",
  "presentation",
  "resume",
  "dashboard",
  "web_app",
  "documentation",
  "ecommerce",
  "portfolio",
  "blog_or_multipage",
  "other",
  "lovable"
]);

/** Эвристика, если модель не вернула kind или JSON битый. */
export function inferArtifactKindFromMessage(message: string): ArtifactKind {
  const m = message.toLowerCase();
  if (
    /\blovable\b|lovable\.dev|как\s+у\s+lovable|как\s+lovable|react\s*\+\s*vite|vite.*react|tsx.*проект|shadcn/i.test(
      m
    )
  ) {
    return "lovable";
  }
  if (
    /\bрезюме\b|\bcv\b|curriculum\s*vitae|summary\s+for\s+(a\s+)?job|поиск\s+работы.*резюм|cover\s+letter\s*\+\s*cv|сопроводительн.*ваканс|ваканс.*резюме|составить\s+резюме/i.test(
      m
    )
  ) {
    return "resume";
  }
  if (
    /\bpptx\b|power\s*point|powerpoint|пауэрпоинт|презентац|слайд|слайды|доклад|deck|pitch|keynote|google\s*slides|спикер|защит[аы]\s+(проект|диплом)/.test(
      m
    )
  ) {
    return "presentation";
  }
  if (/дашборд|dashboard|аналитик|метрик|kpi|bi-|\bотчёт\b.*график|панель\s+показател/.test(m)) {
    return "dashboard";
  }
  if (/документац|docs|wiki|база\s+знан|руководств|справочник|api\s+ref/.test(m)) {
    return "documentation";
  }
  if (/магазин|каталог|корзин|e-?commerce|оплат|товар|checkout|заказать/.test(m)) {
    return "ecommerce";
  }
  if (/портфолио|кейс|наши\s+работы|галерея\s+работ/.test(m)) {
    return "portfolio";
  }
  if (/приложение|админк|crm|saas|панель\s+управлен|личный\s+кабинет|web\s*-?app|интерфейс\s+систем/.test(m)) {
    return "web_app";
  }
  if (/лендинг|landing|посадочн|продажн|воронк|lead|подписка\s+на\s+сервис/.test(m)) {
    return "landing";
  }
  if (/блог|статьи|многостраничн|несколько\s+страниц|главная\s+и\s+|разделы\s+сайта/.test(m)) {
    return "blog_or_multipage";
  }
  if (/\bсайт\b|веб-?страниц|корпоративн\s+сайт|визитк/.test(m)) {
    return "other";
  }
  return "other";
}

export function normalizeArtifactKind(raw: unknown, message: string): ArtifactKind {
  const s = typeof raw === "string" ? raw.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
  const aliases: Record<string, ArtifactKind> = {
    landing: "landing",
    marketing: "landing",
    marketing_landing: "landing",
    promo: "landing",
    presentation: "presentation",
    pptx: "presentation",
    powerpoint: "presentation",
    slides: "presentation",
    slide_deck: "presentation",
    deck: "presentation",
    resume: "resume",
    cv: "resume",
    curriculum_vitae: "resume",
    dashboard: "dashboard",
    admin: "web_app",
    web_app: "web_app",
    webapp: "web_app",
    application: "web_app",
    documentation: "documentation",
    docs: "documentation",
    ecommerce: "ecommerce",
    shop: "ecommerce",
    store: "ecommerce",
    portfolio: "portfolio",
    blog: "blog_or_multipage",
    multipage: "blog_or_multipage",
    website: "other",
    corporate: "other",
    other: "other",
    lovable: "lovable"
  };
  const mapped = aliases[s];
  if (mapped) return mapped;
  if (s && ARTIFACT_KIND_SET.has(s)) return s as ArtifactKind;
  return inferArtifactKindFromMessage(message);
}

function artifactKindExecutionGuidance(kind: ArtifactKind, language: string): string {
  const ru = language === "ru" || /[\u0400-\u04FF]/.test(language);
  const tg = language === "tg";
  const copyNote = tg
    ? "Ҳамаи матни намоён ба забони тоҷикӣ, мувофиқи маънии дархост."
    : ru
      ? "Весь видимый текст на русском, по смыслу запроса пользователя."
      : "Use the user's language for all visible copy.";

  const blocks: Record<ArtifactKind, string> = {
    presentation: [
      "ARTIFACT TYPE: MICROSOFT POWERPOINT (.pptx) + PDF companion.",
      "The runtime builds a real .pptx via pptxgen and a matching PDF — not an HTML-first slide deck.",
      copyNote,
      "- Slides: clear titles, concise bullets, one idea per slide; structure must survive export to PPTX/PDF.",
      "- If you embed slide imagery, follow the same stock-image rules as for web: Picsum seed URLs or Unsplash with credit.",
      "- If this guidance were applied to HTML (it is not for presentation kind), ignore; the executor skips HTML for this artifact_kind."
    ].join("\n"),
    resume: [
      "ARTIFACT TYPE: RESUME / CV — canonical exports: Word (.docx) and PDF via Lemnity (HTML is the editable preview).",
      copyNote,
      "- Layout: header with name, title, contacts; Experience (reverse chronological); Education; Skills; optional Projects, Languages, Certificates.",
      "- Print/document typography; @media print friendly; avoid landing-page chrome, heroes, pricing, or marketing sections.",
      "- Single-column or restrained two-column; scannable, realistic content."
    ].join("\n"),
    dashboard: [
      "ARTIFACT TYPE: DASHBOARD / ANALYTICS (not a marketing landing).",
      copyNote,
      "- Layout: sidebar navigation + main area with KPI cards, charts (SVG or CSS), and at least one data table.",
      "- Dense, tool-like UI; realistic metric labels and numbers.",
      "- No full-width hero with marketing headline unless user asked for marketing."
    ].join("\n"),
    documentation: [
      "ARTIFACT TYPE: DOCUMENTATION / KNOWLEDGE BASE (not a landing).",
      copyNote,
      "- Layout: sticky table of contents (left) + readable article column; optional search field (non-functional ok).",
      "- Headings, lists, code-like blocks in <pre> if relevant.",
      "- Calm typography, plenty of whitespace for reading."
    ].join("\n"),
    ecommerce: [
      "ARTIFACT TYPE: E-COMMERCE / CATALOG (not a generic SaaS landing).",
      copyNote,
      "- Header with cart icon, category nav; product grid with cards (image placeholder, price, CTA).",
      "- Optional filters sidebar; realistic product names in user language.",
      "- Avoid generic 'Subscribe to newsletter' hero unless user asked."
    ].join("\n"),
    portfolio: [
      "ARTIFACT TYPE: PORTFOLIO / CASE STUDIES (not a product landing).",
      copyNote,
      "- Project grid or case-study cards, about section, contact; visual hierarchy for creative work.",
      "- No fake SaaS pricing section."
    ].join("\n"),
    web_app: [
      "ARTIFACT TYPE: WEB APPLICATION SHELL (tool / admin / SaaS UI).",
      copyNote,
      "- Top bar + optional left nav + main workspace; tables, forms, or panels as fits the user request.",
      "- Functional-looking but static preview; realistic labels.",
      "- Not a single marketing hero page."
    ].join("\n"),
    blog_or_multipage: [
      "ARTIFACT TYPE: BLOG OR MULTI-PAGE SITE STRUCTURE (in one HTML file).",
      copyNote,
      "- Simulate multiple pages with anchor sections or tabs: Home, Articles/List, About, Contact — each as a clear section.",
      "- Article list with cards and dates; at least one sample article block.",
      "- Do NOT collapse everything into one hero + three features like a startup landing."
    ].join("\n"),
    landing: [
      "ARTIFACT TYPE: MARKETING LANDING as a **React+TypeScript** project (not one HTML file).",
      copyNote,
      "- Build like a real repo: `src/main.tsx` + `src/App.tsx` + `src/components/*` for sections (Hero, Features, CTA, FAQ, Footer).",
      "- Classic conversion layout is OK: hero, value props, social proof, CTA, footer — as components.",
      "- Tailwind: `className` only. Match the user's product/service, not a generic template.",
      "- Footer row: follow global SITE_FOOTER_GUIDANCE (Lemnity link + build date + privacy placeholder)."
    ].join("\n"),
    lovable: [
      "ARTIFACT TYPE: REACT + TYPESCRIPT APP (Lovable-style).",
      "Output is multiple files: at minimum `src/main.tsx` and `src/App.tsx`, using fences like ` ```tsx:src/main.tsx` then code then closing fence.",
      copyNote,
      "- Styling: Tailwind utility `className` (preview shell injects Tailwind CDN; no PostCSS in output).",
      "- Imports: relative paths only under `src/`. Entry mounts with `createRoot` on `#root`.",
      "- Split UI into small components; `useState` and simple hooks OK; mock data in-module; no real backend.",
      "- If the UI has a site footer, follow SITE_FOOTER_GUIDANCE."
    ].join("\n"),
    other: [
      "ARTIFACT TYPE: OTHER / EXTENSIBLE (HTML preview today; reserved for more export pipelines).",
      copyNote,
      "- Today: one self-contained HTML page matching the user request (not a default marketing landing).",
      "- Future (same kind, different backends): PDF, DOCX, structured data exports, design handoff — do not assume landing-only.",
      "- Read the user message and mirror the structure they imply (corporate site, service page, info site, etc.).",
      "- Avoid startup-landing clichés unless relevant."
    ].join("\n")
  };

  return blocks[kind] ?? blocks.other;
}

export function excerptHtmlForPlanner(html: string, maxTotal = 12_000): string {
  const t = html.trim();
  if (t.length <= maxTotal) return t;
  const head = Math.floor(maxTotal * 0.65);
  const tail = maxTotal - head - 80;
  return `${t.slice(0, head)}\n\n<!-- … ${t.length - head - tail} chars omitted … -->\n\n${t.slice(t.length - tail)}`;
}

export function truncateHtmlForRevision(html: string, max = 180_000): string {
  const t = html.trim();
  if (t.length <= max) return t;
  const head = 120_000;
  const tail = max - head - 120;
  return `${t.slice(0, head)}\n<!-- … truncated ${t.length - head - tail} chars … -->\n${t.slice(t.length - tail)}`;
}

export function createPlanPrompt(input: {
  message: string;
  attachments?: string;
  sessionContext?: { transcript: string; priorHtmlExcerpt: string | null };
  /** Язык интерфейса приложения: тексты плана на этом языке (не только по языку сообщения). */
  uiLanguage?: AppUiLanguage;
}): string {
  const rev = input.sessionContext?.priorHtmlExcerpt?.trim();
  const trans = input.sessionContext?.transcript?.trim();
  const revisionBlock =
    rev && rev.length > 0
      ? [
          "",
          "SESSION CONTINUITY (critical):",
          "- This chat already has a generated HTML preview in this session.",
          "- The latest user message is a FOLLOW-UP: iterate on that same project (layout, copy, colors, sections).",
          "- Do NOT plan a completely new unrelated website or change the product type unless the user clearly asks to pivot.",
          "- Keep the same artifact_kind as fits the EXISTING build (see HTML excerpt below), unless the user explicitly requests a different deliverable type.",
          "- Steps must describe incremental edits (what to change in the current UI), not 'build a new site from scratch'.",
          "",
          "Excerpt of the current HTML preview (reference only; full document is sent to the executor):",
          "```html",
          rev,
          "```",
          ""
        ].join("\n")
      : trans && trans.length > 20
        ? [
            "",
            "CONVERSATION SO FAR (same session — keep topic and deliverable consistent):",
            trans,
            ""
          ].join("\n")
        : "";

  const ui: AppUiLanguage = input.uiLanguage ?? "ru";
  const { code: uiCode, labelEn: uiLabel } = appLanguageInstruction(ui);
  const localeBlock = [
    "",
    "LOCALE (mandatory — follow the app UI language, not only the user message language):",
    `- App UI language code: **${uiCode}** (${uiLabel}).`,
    "- Write `message`, `title`, `goal`, and every `steps[].description` in that language.",
    '- Keep `steps[].id` as short ASCII in SCREAMING-KEBAB-CASE (e.g. "PROJECT-STRUCTURE", "CART-AND-CHECKOUT").',
    `- The JSON string field "language" MUST be exactly "${uiCode}".`,
    ""
  ].join("\n");

  return [
    LEMNITY_SYSTEM_PROMPT,
    "",
    "Create a compact execution plan for generating the visual preview.",
    revisionBlock,
    localeBlock,
    "Return only valid JSON matching this TypeScript interface:",
    "```typescript",
    "type ArtifactKind =",
    '  | "landing"              // маркетинговый лендинг, посадочная, воронка',
    '  | "presentation"       // PowerPoint .pptx + PDF: презентация, слайды, pptx, deck',
    '  | "resume"             // резюме/CV: HTML-превью → экспорт DOCX/PDF',
    '  | "dashboard"          // дашборд, метрики, аналитика',
    '  | "web_app"            // интерфейс приложения, админка, CRM',
    '  | "documentation"      // документация, wiki, база знаний',
    '  | "ecommerce"          // магазин, каталог',
    '  | "portfolio"          // портфолио, кейсы',
    '  | "blog_or_multipage"  // блог, несколько разделов сайта',
    '  | "lovable"            // React+TS многофайловый (как lovable.dev), не один HTML',
    '  | "other";             // прочее HTML сейчас; позже: PDF, DOCX, выгрузки и др.',
    "interface CreatePlanResponse {",
    "  message: string;",
    "  language: string; // MUST match the app UI language described above (ru | en | tg).",
    "  goal: string;",
    "  title: string;",
    "  artifact_kind: ArtifactKind; // MUST match user intent — not always landing",
    "  steps: Array<{ id: string; description: string }>;",
    "}",
    "```",
    "",
    "Rules:",
    "- Choose artifact_kind from the user's wording (Russian and English). Lovable / react+vite / «как у lovable» → lovable. PowerPoint / презентацию / pptx → presentation. Резюме / CV → resume.",
    "- Use 3 to 6 atomic steps tailored to that artifact_kind.",
    "- Include at least one step for access/data logic (roles, visibility, data behavior) when relevant.",
    "- Include at least one QA step for responsive + loading/empty/error states.",
    "- Steps describe UI generation work, not advice to the user.",
    "- Do not ignore LOCALE: plan copy must be in the app UI language even if the user message is in another language.",
    "- The title should be short enough for a session name.",
    "",
    "User message:",
    input.message,
    "",
    "Attachments:",
    input.attachments?.trim() || "None"
  ].join("\n");
}

export function executeUiPrompt(input: {
  message: string;
  plan: BuilderPlan;
  modelContext?: string;
  /** Полный HTML прошлой сборки — режим правки, а не «с нуля». */
  priorHtml?: string | null;
}): string {
  const steps = input.plan.steps.map((s) => `${s.id}. ${s.description}`).join("\n");
  const kindGuidance = artifactKindExecutionGuidance(input.plan.artifact_kind, input.plan.language);
  const prior = input.priorHtml?.trim();

  return [
    LEMNITY_SYSTEM_PROMPT,
    "",
    "Generate the final visual preview artifact for Lemnity.",
    "",
    kindGuidance,
    "",
    prior
      ? [
          "ITERATIVE EDIT (mandatory):",
          "Below is the EXISTING HTML from this session. Apply the user's new request as changes to this document.",
          "Output ONE complete updated HTML5 document.",
          "Preserve all sections, structure, copy, and styling that the user did NOT ask to change.",
          "Do not replace the project with an unrelated design unless the user explicitly asked for a full redesign or a different product.",
          "",
          "--- EXISTING HTML (edit this) ---",
          prior,
          "--- END EXISTING HTML ---",
          ""
        ].join("\n")
      : "",
    "Strict output rules:",
    "- Return exactly one complete HTML document.",
    "- Start with <!doctype html> or <html>.",
    "- Include all CSS inside <style>.",
    "- Do not wrap the answer in Markdown fences.",
    "- Do not include explanatory prose outside the HTML.",
    "- The preview must be visually complete on typical desktop and mobile widths.",
    "",
    "General technical guidance:",
    "- Strong typography, clear hierarchy; use CSS flex/grid.",
    "- Charts/diagrams: inline SVG or pure CSS when needed.",
    "- Include resilient UI states where applicable: loading, empty, and error.",
    "- Keep role-gated sections explicit in UI (for example, visible badges/blocks for FREE vs PRO if request implies plans).",
    "- Keep JavaScript minimal and safe; no external scripts or fonts unless data URLs (prefer system font stack).",
    "",
    input.modelContext ? `Additional Lemnity context:\n${input.modelContext}\n` : "",
    `Plan title: ${input.plan.title}`,
    `Artifact kind (must follow): ${input.plan.artifact_kind}`,
    `Goal: ${input.plan.goal}`,
    "Plan steps:",
    steps,
    "",
    "Original user request:",
    input.message
  ].join("\n");
}

export function executeLovableUiPrompt(input: {
  message: string;
  plan: BuilderPlan;
  modelContext?: string;
}): string {
  const steps = input.plan.steps.map((s) => `${s.id}. ${s.description}`).join("\n");
  const kindGuidance = artifactKindExecutionGuidance("lovable", input.plan.language);

  return [
    LEMNITY_SYSTEM_PROMPT,
    "",
    "Generate the Lovable-style React+TypeScript preview for Lemnity (multiple source files, not one HTML string).",
    "",
    kindGuidance,
    "",
    "Strict output rules:",
    "- Output one or more fenced code blocks. Each block opens with ` ```tsx:relative/path.tsx` or ` ```ts:relative/path.ts` (language, colon, path on the same line as the opening fence), then the file body, then closing fence.",
    "- Required files: `src/main.tsx` (createRoot on document.getElementById('root')), `src/App.tsx`, `src/index.css`, `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`.",
    "- Use Tailwind classes in `className` only (Tailwind CDN is injected in preview).",
    "- Use relative imports between files under `src/`.",
    "- Do not output a single <!doctype html> document in place of source files.",
    "- Do not wrap the entire answer in one big markdown code fence without per-file paths.",
    "- No explanatory prose outside fenced files.",
    "",
    "General guidance:",
    "- Strong visual hierarchy; responsive layout with flex/grid utilities.",
    "- Include loading/empty/error states for key interactive areas (tables, lists, cards) where it makes sense.",
    "- If request implies plans/roles/access, reflect feature gating in UI structure and copy.",
    "",
    input.modelContext ? `Additional Lemnity context:\n${input.modelContext}\n` : "",
    `Plan title: ${input.plan.title}`,
    "Artifact kind: lovable",
    `Goal: ${input.plan.goal}`,
    "Plan steps:",
    steps,
    "",
    "Original user request:",
    input.message
  ].join("\n");
}

export function summarizePrompt(input: { message: string; plan: BuilderPlan }): string {
  return [
    LEMNITY_SYSTEM_PROMPT,
    "",
    "Write a short assistant message after the preview has been generated.",
    "Do not include the HTML code. Mention that the preview is ready and summarize what was built (type + topic) in 1-2 concise sentences.",
    "Use the user's language.",
    "",
    `Plan title: ${input.plan.title}`,
    `Artifact kind: ${input.plan.artifact_kind}`,
    `Goal: ${input.plan.goal}`,
    "",
    "User request:",
    input.message
  ].join("\n");
}

export function fallbackPlan(message: string): BuilderPlan {
  const isRu = /[\u0400-\u04FF]/.test(message);
  const kind = inferArtifactKindFromMessage(message);
  const kindLabel = isRu ? `Тип: ${kind}` : `Type: ${kind}`;

  const stepsFor = (): PlanStep[] => {
    if (kind === "presentation") {
      return isRu
        ? [
            { id: "outline", description: "Структура слайдов и тезисы для .pptx" },
            { id: "pptx", description: "Сборка файла PowerPoint (pptxgen)" },
            { id: "export", description: "Выдача готового .pptx для скачивания" }
          ]
        : [
            { id: "outline", description: "Slide outline and copy for .pptx" },
            { id: "pptx", description: "Build PowerPoint file (pptxgen)" },
            { id: "export", description: "Emit downloadable .pptx" }
          ];
    }
    if (kind === "resume") {
      return isRu
        ? [
            { id: "structure", description: "Структура резюме под DOCX/PDF: блоки и иерархия" },
            { id: "layout", description: "Типографика и сетка как у печатного документа" },
            { id: "html", description: "HTML-превью для правок в Lemnity (без лендинговых шаблонов)" }
          ]
        : [
            { id: "structure", description: "Resume structure for DOCX/PDF: sections and hierarchy" },
            { id: "layout", description: "Print-like typography and grid" },
            { id: "html", description: "HTML preview for in-app editing (no landing clichés)" }
          ];
    }
    if (kind === "lovable") {
      return isRu
        ? [
            {
              id: "structure",
              description:
                "Структура проекта как в Vite: index.html, package.json, vite.config.ts, tsconfig*.json, src/main.tsx, src/App.tsx"
            },
            { id: "tsx", description: "React+TSX, Tailwind через className" },
            { id: "preview", description: "Сервер соберёт esbuild-превью" }
          ]
        : [
            {
              id: "structure",
              description:
                "Vite-like project structure: index.html, package.json, vite.config.ts, tsconfig*.json, src/main.tsx, src/App.tsx"
            },
            { id: "tsx", description: "React+TSX with Tailwind className" },
            { id: "preview", description: "Server builds esbuild preview" }
          ];
    }
    if (kind === "dashboard") {
      return isRu
        ? [
            { id: "shell", description: "Каркас: сайдбар и область метрик" },
            { id: "widgets", description: "KPI-карточки, графики SVG, таблица" },
            { id: "theme", description: "Визуальная стиль дашборда" }
          ]
        : [
            { id: "shell", description: "Sidebar + main metrics area" },
            { id: "widgets", description: "KPI cards, SVG charts, table" },
            { id: "theme", description: "Dashboard visual theme" }
          ];
    }
    return isRu
      ? [
          { id: "plan", description: `${kindLabel} — структура по запросу` },
          { id: "layout", description: "Сетка и типографика под выбранный тип" },
          { id: "html", description: "Сверстать HTML-превью без шаблона «лендинг стартапа», если не просили" },
          { id: "preview", description: "Проверить адаптив и контент" }
        ]
      : [
          { id: "plan", description: `${kindLabel} — structure from request` },
          { id: "layout", description: "Grid and typography for this artifact type" },
          { id: "html", description: "Build HTML preview (no default startup landing unless asked)" },
          { id: "preview", description: "Responsive check and content" }
        ];
  };

  return {
    message: isRu
      ? "Собираю превью с учётом типа запроса (не всегда лендинг)."
      : "Building a preview that matches your request type (not always a landing).",
    language: isRu ? "ru" : "en",
    goal:
      kind === "presentation"
        ? isRu
          ? "Файл презентации PowerPoint (.pptx) по запросу пользователя"
          : "PowerPoint presentation file (.pptx) per user request"
        : kind === "resume"
          ? isRu
            ? "Резюме (DOCX/PDF) по запросу — редактируемое HTML-превью"
            : "Resume (DOCX/PDF) per request — editable HTML preview"
        : kind === "lovable"
          ? isRu
            ? "React+TypeScript-приложение (превью как Lovable)"
            : "React+TypeScript app (Lovable-style preview)"
        : kind === "dashboard"
          ? isRu
            ? "Дашборд с метриками по запросу"
            : "Metrics dashboard per user request"
          : isRu
            ? "Визуальное превью по запросу пользователя"
            : "Visual preview per user request",
    title: message.trim().slice(0, 80) || (isRu ? "Новая сборка" : "New build"),
    artifact_kind: kind,
    steps: stepsFor()
  };
}
