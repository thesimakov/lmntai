export type PlanStep = {
  id: string;
  description: string;
};

/** Тип визуального артефакта — планировщик обязан выбрать по смыслу запроса, не по умолчанию. */
export type ArtifactKind =
  | "landing"
  | "presentation"
  | "dashboard"
  | "web_app"
  | "documentation"
  | "ecommerce"
  | "portfolio"
  | "blog_or_multipage"
  | "other";

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
  "You are Lemnity Builder, an AI interface-generation agent embedded in the Lemnity platform.",
  "Your job is to turn the user's request into a polished, working visual preview in ONE self-contained HTML file.",
  "You do not have a shell, browser automation, or external sandbox. Do not claim to run commands or inspect websites.",
  "You may plan work, show progress, and produce a complete artifact.",
  "CRITICAL: Infer the deliverable TYPE from the user's words. Examples: «презентация», «pptx», «PowerPoint», «слайды», «deck» → presentation (real .pptx file, not HTML); «дашборд», «метрики» → dashboard; «документация», «wiki» → docs layout; «магазин», «каталог» → ecommerce; «портфолио» → portfolio; «приложение», «админка» → web app; «лендинг», «посадочная» → marketing landing; «сайт», «несколько страниц», «блог» → multi-section site or blog_or_multipage, NOT a single hero landing unless they ask for marketing landing.",
  "Do NOT default to a SaaS marketing landing (hero + 3 features + pricing) unless the user clearly wants a promotional landing or product marketing page.",
  "Visible copy in the generated UI must use the user's language.",
  "Prefer production-quality UI: responsive where appropriate, semantic HTML, accessible labels, strong hierarchy, realistic content, no lorem ipsum unless asked.",
  "The final artifact must be one self-contained HTML5 document with embedded CSS and optional small inline JavaScript only when useful (e.g. slide navigation)."
].join("\n");

const ARTIFACT_KIND_SET = new Set<string>([
  "landing",
  "presentation",
  "dashboard",
  "web_app",
  "documentation",
  "ecommerce",
  "portfolio",
  "blog_or_multipage",
  "other"
]);

/** Эвристика, если модель не вернула kind или JSON битый. */
export function inferArtifactKindFromMessage(message: string): ArtifactKind {
  const m = message.toLowerCase();
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
    other: "other"
  };
  const mapped = aliases[s];
  if (mapped) return mapped;
  if (s && ARTIFACT_KIND_SET.has(s)) return s as ArtifactKind;
  return inferArtifactKindFromMessage(message);
}

function artifactKindExecutionGuidance(kind: ArtifactKind, language: string): string {
  const ru = language === "ru" || /[\u0400-\u04FF]/.test(language);
  const copyNote = ru
    ? "Весь видимый текст на русском, по смыслу запроса пользователя."
    : "Use the user's language for all visible copy.";

  const blocks: Record<ArtifactKind, string> = {
    presentation: [
      "ARTIFACT TYPE: MICROSOFT POWERPOINT (.pptx).",
      "The runtime builds a real .pptx via pptxgen (not an HTML slide page).",
      copyNote,
      "- If this guidance were applied to HTML (it is not for presentation kind), ignore; the executor skips HTML for this artifact_kind."
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
      "ARTIFACT TYPE: MARKETING LANDING PAGE.",
      copyNote,
      "- Classic conversion-focused layout is OK: hero, value props, social proof, CTA, footer.",
      "- Match the user's product/service, not a generic template."
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

  return [
    LEMNITY_SYSTEM_PROMPT,
    "",
    "Create a compact execution plan for generating the visual preview.",
    revisionBlock,
    "Return only valid JSON matching this TypeScript interface:",
    "```typescript",
    "type ArtifactKind =",
    '  | "landing"              // маркетинговый лендинг, посадочная, воронка',
    '  | "presentation"       // PowerPoint .pptx: презентация, слайды, pptx, deck',
    '  | "dashboard"          // дашборд, метрики, аналитика',
    '  | "web_app"            // интерфейс приложения, админка, CRM',
    '  | "documentation"      // документация, wiki, база знаний',
    '  | "ecommerce"          // магазин, каталог',
    '  | "portfolio"          // портфолио, кейсы',
    '  | "blog_or_multipage"  // блог, несколько разделов сайта',
    '  | "other";             // прочее HTML сейчас; позже: PDF, DOCX, выгрузки и др.',
    "interface CreatePlanResponse {",
    "  message: string;",
    "  language: string; // 'ru' or 'en' etc.",
    "  goal: string;",
    "  title: string;",
    "  artifact_kind: ArtifactKind; // MUST match user intent — not always landing",
    "  steps: Array<{ id: string; description: string }>;",
    "}",
    "```",
    "",
    "Rules:",
    "- Choose artifact_kind from the user's wording (Russian and English). If they want PowerPoint / презентацию / pptx, use presentation (file export), not landing.",
    "- Use 3 to 6 atomic steps tailored to that artifact_kind.",
    "- Steps describe UI generation work, not advice to the user.",
    "- If the user asks in Russian, use Russian for message/title/steps.",
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
