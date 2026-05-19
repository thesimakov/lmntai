import { appendProjectBrandKitToSystemPrompt } from "@/lib/project-brand-kit-library";
import type { PresentationTemplate } from "./templates";

const SYSTEM_PROMPT = `You are a presentation architect. Generate a SlideGraph JSON for the presentation described by the user.

RULES:
- Return ONLY valid JSON, no markdown, no code fences, no commentary
- version must be exactly 1
- slides array must have at least 3 slides; first slide must use layout "title"
- Every element must have a unique id (snake_case, e.g. "title_1", "body_2")
- Every slide must have a unique id (snake_case, e.g. "slide_1", "slide_2")
- Element types: heading | subheading | body | bullet-list | image | quote | caption | label
- Layouts: title | content | two-column | image-left | image-right | blank | quote | section-divider
- bullet-list elements use "items" array, not "content"
- image elements use "src" (real URL from picsum.photos or unsplash) and "alt"
- theme.primaryColor and theme.backgroundColor must be valid hex colors

LAYOUT GUIDANCE:
- "title": main title + subtitle, used for first slide and section openers
- "content": heading + body text or bullets (most common)
- "two-column": side-by-side content blocks
- "image-left" / "image-right": image + text side by side
- "quote": large pull-quote with attribution
- "section-divider": visual break between sections (minimal elements)
- "blank": fully custom, no constraints

SCHEMA:
{
  "version": 1,
  "meta": {
    "title": "Deck title",
    "language": "ru" or "en" (exactly 2 characters, not full language names),
    "theme": {
      "primaryColor": "#hex",
      "backgroundColor": "#hex",
      "textColor": "#hex",
      "fontFamily": "Inter, sans-serif"
    },
    "generatedAt": ""
  },
  "slides": [{
    "id": "slide_1",
    "layout": "title",
    "background": { "color": "#optional-hex" },
    "elements": [
      { "id": "title_1", "type": "heading", "content": "..." },
      { "id": "subtitle_1", "type": "subheading", "content": "..." }
    ]
  }]
}

Generate 6–12 slides for a complete deck. Include an agenda/overview slide if appropriate.`;

export function buildSlideGraphPrompt(
  userPrompt: string,
  brandKitBlock?: string | null
): Array<{ role: "system" | "user"; content: string }> {
  const system = appendProjectBrandKitToSystemPrompt(
    brandKitBlock?.trim()
      ? `${SYSTEM_PROMPT}\n\nWhen a project brand kit is provided below, set meta.theme colors and fontFamily from the brand palette and typography. Match tone of voice in slide copy.`
      : SYSTEM_PROMPT,
    brandKitBlock
  );
  return [
    { role: "system", content: system },
    { role: "user", content: userPrompt },
  ];
}

export const SLIDE_GRAPH_RETRY_MESSAGE =
  "Your response was not valid JSON or did not match the required schema. " +
  "Return ONLY the JSON object, no markdown, no code fences. " +
  "Ensure slides array has at least 1 item, all layouts and element types are valid, " +
  "and all ids are unique snake_case strings.";

// ============================================================
// TEMPLATE-BASED PROMPT
// ============================================================

const RICH_ELEMENT_SCHEMA = `
RICH ELEMENT TYPES (for template layouts):

metric-card: { "id": "...", "type": "metric-card", "label": "Card title", "description": "Explanation text" }
stat-number: { "id": "...", "type": "stat-number", "value": "68%", "change": "+25%", "label": "metric name" }
feature-card: { "id": "...", "type": "feature-card", "badge": "CORE", "content": "Feature Title", "description": "Short explanation" }
step-card: { "id": "...", "type": "step-card", "stepNumber": 1, "content": "Step Title", "description": "What happens" }
pricing-card: { "id": "...", "type": "pricing-card", "planName": "Free", "price": "0", "period": "руб/мес", "features": ["Feature 1", "Feature 2"], "popular": false }
timeline-col: { "id": "...", "type": "timeline-col", "period": "Q2 2026", "content": "Phase Title", "items": ["Milestone 1", "Milestone 2"], "highlighted": false }

RICH LAYOUT TYPES:
- "metrics-cards": heading + subheading + metric-card × 3 + stat-number × 3
- "dark-solution": heading + subheading + feature-card × 4 (use background.color = primaryColor)
- "steps-grid": heading + step-card × 4
- "feature-grid-6": heading + feature-card × 6
- "dark-metrics": heading + stat-number × 3 + metric-card × 4 (use background.color = "#1A1A2E")
- "pricing-3col": heading + subheading + pricing-card × 3
- "market-split": heading + stat-number × 3 + feature-card × 3
- "timeline-4col": heading + timeline-col × 4
- "cta-split": heading + subheading + body + metric-card × 1-2 (for right panel info)
`;

export function buildTemplateSlidePrompt(
  template: PresentationTemplate,
  userBrief: string,
  sourceDocument?: { fileName: string; text: string } | null,
  brandKitBlock?: string | null
): Array<{ role: "system" | "user"; content: string }> {
  const structureList = template.slideStructure
    .map(
      (hint, i) =>
        `Slide ${i + 1}: layout="${hint.layout}" — ${hint.purpose}\n  Elements: ${hint.elementHints}`
    )
    .join("\n\n");

  const themeJson = JSON.stringify(template.theme, null, 2);

  const hasBrandKit = Boolean(brandKitBlock?.trim());
  const themeSection = hasBrandKit
    ? `THEME: Use the PROJECT BRAND KIT palette and typography for meta.theme (override template defaults below). Template default reference only:\n${themeJson}`
    : `THEME (use exactly these colors):\n${themeJson}`;

  let systemPrompt = `You are a presentation architect. Generate a SlideGraph JSON following the EXACT template structure below.

${template.systemPromptAddition}

RULES:
- Return ONLY valid JSON, no markdown, no code fences, no commentary
- version must be exactly 1
- Every element must have a unique id (snake_case)
- Every slide must have a unique id (snake_case)
- Use EXACTLY the layouts listed in the TEMPLATE STRUCTURE — do not change or reorder them
- All ids must be unique snake_case strings
- "generatedAt" field must be empty string ""
- meta.language must be exactly "ru" or "en" (never "Russian" or "English")
- templateId must be "${template.id}"

${RICH_ELEMENT_SCHEMA}

${themeSection}

TEMPLATE STRUCTURE (follow exactly in this order):
${structureList}

IMPORTANT LAYOUT RULES:
- For "dark-solution": set background.color to the primaryColor from theme
- For "dark-metrics": set background.color to "#1A1A2E"
- For "cta-split": set background of the slide to the primaryColor (background.color = primaryColor)
- For "title": you may use gradient via background.gradient (CSS gradient string) for visual appeal
- All content must be filled with real, contextual information from the user brief
- Make numbers and data specific and realistic based on the brief`;

  systemPrompt = appendProjectBrandKitToSystemPrompt(systemPrompt, brandKitBlock);
  if (hasBrandKit) {
    systemPrompt +=
      "\n\nBrand kit is mandatory: meta.theme must use brand palette colors; copy should follow brand tone of voice and company context.";
  }

  const briefBlock = userBrief.trim()
    ? `USER BRIEF:\n${userBrief.trim()}`
    : "USER BRIEF:\n(не указано — опирайтесь на прикреплённый документ)";

  const sourceBlock =
    sourceDocument?.text.trim()
      ? `\n\nATTACHED DOCUMENT (${sourceDocument.fileName}):\nUse this as primary factual source for metrics, names, product details, and narrative. Prefer document facts over invented data.\n\n${sourceDocument.text.trim()}`
      : "";

  const userMessage = `${briefBlock}${sourceBlock}\n\nGenerate the full ${template.slideCount}-slide ${template.name} presentation following the template structure exactly.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];
}

export const TEMPLATE_SLIDE_RETRY_MESSAGE =
  "Your response was not valid JSON or did not match the required schema. " +
  "Return ONLY the top-level JSON object (not wrapped in slideGraph/data). Ensure: " +
  "1) version is number 1; meta.language is exactly \"ru\" or \"en\" (2 chars). " +
  "2) All slides use EXACTLY the layouts from the template structure in order. " +
  "3) Rich element types (metric-card, feature-card, step-card, stat-number, pricing-card, timeline-col) for rich layouts. " +
  "4) Every slide has elements[] with at least one item; all ids unique snake_case. " +
  "5) No markdown, no code fences, no trailing commas.";

// ============================================================
// CHAT PROMPT
// ============================================================

export const SLIDE_CHAT_SYSTEM_PROMPT = `You are a presentation editor assistant. The user wants to modify their presentation.

When the user requests changes, respond with a JSON object:
{
  "message": "Brief description of changes made (1-2 sentences)",
  "patches": [
    {
      "slideId": "slide_1",
      "elemId": "title_1",
      "content": "New text content",
      "style": { "color": "#2563eb" },
      "frame": { "x": 80, "y": 100, "w": 400, "h": 72 }
    }
  ],
  "slideBackground": { "slideId": "slide_1", "background": { "color": "#1a1a2e" } },
  "addElement": {
    "slideId": "slide_1",
    "element": { "id": "metric_new", "type": "metric-card", "label": "ARR", "description": "2.4M" }
  },
  "deleteElement": { "slideId": "slide_1", "elemId": "old_block" }
}

Rules:
- patches can be omitted or [] if only answering a question (no slide edits)
- Each patch targets one element by slideId + elemId; include only fields that change
- Text content may contain line breaks as \\n — preserve them in content strings
- Element patches may include: content, items, src, alt, style, value, label, description, change, badge, price, period, features, popular, highlighted, frame (x,y,w,h in 960×540 canvas)
- slideBackground: set color and/or gradient on a slide (solid color clears gradient)
- addElement: append a new element (unique id, valid type); new elements on freeform slides should include frame
- deleteElement: remove element by slideId + elemId
- Use existing slideId and elemId values from the SlideGraph summary
- Return ONLY valid JSON, no markdown`;

export function buildSlideChatPrompt(
  graph: import("./types").SlideGraph,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  message: string,
  brandKitBlock?: string | null
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const slideIndex = graph.slides.map((s) => ({
    slideId: s.id,
    layout: s.layout,
    freeform: s.freeform ?? false,
    elements: s.elements.map((el) => ({
      elemId: el.id,
      type: el.type,
      frame: el.frame,
    })),
  }));
  const graphSummary = JSON.stringify({ meta: graph.meta.title, slides: slideIndex }, null, 2).slice(
    0,
    12_000
  );
  const system = appendProjectBrandKitToSystemPrompt(
    `${SLIDE_CHAT_SYSTEM_PROMPT}

When editing theme or colors, keep the project brand kit constraints.

Current SlideGraph:
\`\`\`json
${graphSummary}
\`\`\``,
    brandKitBlock
  );

  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: message },
  ];
}

export const SLIDE_CHAT_RETRY_MESSAGE =
  "Your response was not valid JSON. Return ONLY a JSON object with 'message' and optional 'patches', 'slideBackground', 'addElement', 'deleteElement'. No markdown, no code fences.";
