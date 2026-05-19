import { z } from "zod";
import type { PresentationTemplate } from "./templates";
import type {
  Slide,
  SlideElement,
  SlideElementFrame,
  SlideElementType,
  SlideGraph,
  SlideLayout,
} from "./types";
import { clearMassLockedSlideElements } from "./element-lock";
import { slideGraphSchema } from "./schema";

const SLIDE_LAYOUTS: SlideLayout[] = [
  "title",
  "content",
  "two-column",
  "image-left",
  "image-right",
  "blank",
  "quote",
  "section-divider",
  "metrics-cards",
  "dark-solution",
  "steps-grid",
  "feature-grid-6",
  "dark-metrics",
  "pricing-3col",
  "market-split",
  "timeline-4col",
  "cta-split",
];

const ELEMENT_TYPES: SlideElementType[] = [
  "heading",
  "subheading",
  "body",
  "bullet-list",
  "image",
  "quote",
  "caption",
  "label",
  "metric-card",
  "feature-card",
  "step-card",
  "stat-number",
  "pricing-card",
  "timeline-col",
];

const LAYOUT_SET = new Set<string>(SLIDE_LAYOUTS);
const ELEMENT_SET = new Set<string>(ELEMENT_TYPES);

const LANGUAGE_ALIASES: Record<string, string> = {
  ru: "ru",
  en: "en",
  russian: "ru",
  русский: "ru",
  rus: "ru",
  english: "en",
  английский: "en",
  eng: "en",
};

function coerceHexColor(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (/^#[0-9A-Fa-f]{3,8}$/.test(t)) return t;
  return fallback;
}

/** Закрывает обрезанный JSON (обрыв по max_tokens). */
export function repairTruncatedJson(json: string): string {
  let s = json.trim();
  s = s.replace(/,?\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*"[^"\\]*(?:\\.[^"\\]*)*$/s, "");
  s = s.replace(/,\s*$/s, "");

  const stack: Array<"{" | "["> = [];
  let inString = false;
  let escape = false;

  for (const ch of s) {
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") stack.push("{");
    else if (ch === "[") stack.push("[");
    else if (ch === "}") {
      if (stack[stack.length - 1] === "{") stack.pop();
    } else if (ch === "]") {
      if (stack[stack.length - 1] === "[") stack.pop();
    }
  }

  if (inString) s += '"';
  while (stack.length > 0) {
    const open = stack.pop();
    s += open === "{" ? "}" : "]";
  }

  return s;
}

export function unwrapSlideGraphRoot(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const root = raw as Record<string, unknown>;
  if (Array.isArray(root.slides)) return raw;

  for (const key of ["slideGraph", "slide_graph", "graph", "deck", "presentation", "data"]) {
    const nested = root[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const n = nested as Record<string, unknown>;
      if (Array.isArray(n.slides)) return nested;
    }
  }
  return raw;
}

export function extractJsonFromAiText(text: string): unknown | null {
  let json = text.trim();
  const fence = json.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) json = fence[1].trim();

  const tryParse = (candidate: string): unknown | null => {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      try {
        return JSON.parse(repairTruncatedJson(candidate)) as unknown;
      } catch {
        return null;
      }
    }
  };

  const direct = tryParse(json);
  if (direct) return direct;

  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return tryParse(json.slice(start, end + 1));
}

function coerceLanguage(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "ru";
  const key = raw.trim().toLowerCase();
  const mapped = LANGUAGE_ALIASES[key];
  if (mapped) return mapped;
  const short = key.slice(0, 5);
  if (short.length >= 2) return short;
  return "ru";
}

function coerceLayout(raw: unknown, fallback: SlideLayout): SlideLayout {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  const normalized = raw.trim().toLowerCase().replace(/_/g, "-");
  if (LAYOUT_SET.has(normalized)) return normalized as SlideLayout;
  const compact = normalized.replace(/\s+/g, "-");
  if (LAYOUT_SET.has(compact)) return compact as SlideLayout;
  return fallback;
}

function coerceElementType(raw: unknown): SlideElementType {
  if (typeof raw !== "string" || !raw.trim()) return "body";
  const normalized = raw.trim().toLowerCase().replace(/_/g, "-");
  if (ELEMENT_SET.has(normalized)) return normalized as SlideElementType;
  const compact = normalized.replace(/\s+/g, "-");
  if (ELEMENT_SET.has(compact)) return compact as SlideElementType;
  return "body";
}

function coerceStringArray(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const items = raw
      .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
      .filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

function coerceFrame(raw: unknown): SlideElementFrame | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const f = raw as Record<string, unknown>;
  const x = typeof f.x === "number" && Number.isFinite(f.x) ? f.x : undefined;
  const y = typeof f.y === "number" && Number.isFinite(f.y) ? f.y : undefined;
  const w = typeof f.w === "number" && Number.isFinite(f.w) ? f.w : undefined;
  const h = typeof f.h === "number" && Number.isFinite(f.h) ? f.h : undefined;
  if (x === undefined || y === undefined || w === undefined || h === undefined) return undefined;
  const zIndex =
    typeof f.zIndex === "number" && Number.isFinite(f.zIndex) ? Math.trunc(f.zIndex) : undefined;
  return { x, y, w, h, zIndex };
}

function coerceElement(raw: unknown, index: number, slideId: string): SlideElement | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;
  const id =
    typeof e.id === "string" && e.id.trim()
      ? e.id.trim()
      : `${slideId}_el_${index + 1}`;
  const type = coerceElementType(e.type);
  const content = typeof e.content === "string" ? e.content : undefined;
  const items = coerceStringArray(e.items);
  const features = coerceStringArray(e.features);

  let stepNumber: number | undefined;
  if (typeof e.stepNumber === "number" && Number.isFinite(e.stepNumber)) {
    stepNumber = Math.trunc(e.stepNumber);
  } else if (typeof e.stepNumber === "string" && e.stepNumber.trim()) {
    const n = Number.parseInt(e.stepNumber, 10);
    if (Number.isFinite(n)) stepNumber = n;
  }

  const styleRaw = e.style;
  let style: SlideElement["style"];
  if (styleRaw && typeof styleRaw === "object" && !Array.isArray(styleRaw)) {
    const s = styleRaw as Record<string, unknown>;
    const fontWeight =
      s.fontWeight === "bold" || s.fontWeight === "normal" ? s.fontWeight : undefined;
    const textAlign =
      s.textAlign === "left" || s.textAlign === "center" || s.textAlign === "right"
        ? s.textAlign
        : undefined;
    let opacity: number | undefined;
    if (typeof s.opacity === "number" && Number.isFinite(s.opacity)) {
      opacity = Math.min(1, Math.max(0, s.opacity));
    }
    style = {
      color: typeof s.color === "string" ? s.color : undefined,
      labelColor: typeof s.labelColor === "string" ? s.labelColor : undefined,
      descriptionColor: typeof s.descriptionColor === "string" ? s.descriptionColor : undefined,
      valueColor: typeof s.valueColor === "string" ? s.valueColor : undefined,
      changeColor: typeof s.changeColor === "string" ? s.changeColor : undefined,
      fontSize: typeof s.fontSize === "string" ? s.fontSize : undefined,
      fontWeight,
      textAlign,
      italic: typeof s.italic === "boolean" ? s.italic : undefined,
      opacity,
    };
    if (Object.values(style).every((v) => v === undefined)) style = undefined;
  }

  const locked = typeof e.locked === "boolean" ? e.locked : false;
  const visible = typeof e.visible === "boolean" ? e.visible : true;
  const name = typeof e.name === "string" ? e.name : undefined;

  return {
    id,
    type,
    content,
    items: type === "bullet-list" ? items ?? (content ? [content] : ["—"]) : items,
    src: typeof e.src === "string" ? e.src : undefined,
    alt: typeof e.alt === "string" ? e.alt : undefined,
    style,
    value: e.value != null ? String(e.value) : undefined,
    label: typeof e.label === "string" ? e.label : undefined,
    description: typeof e.description === "string" ? e.description : undefined,
    change: typeof e.change === "string" ? e.change : undefined,
    badge: typeof e.badge === "string" ? e.badge : undefined,
    iconKeyword: typeof e.iconKeyword === "string" ? e.iconKeyword : undefined,
    stepNumber,
    planName: typeof e.planName === "string" ? e.planName : undefined,
    price: e.price != null ? String(e.price) : undefined,
    period: typeof e.period === "string" ? e.period : undefined,
    features,
    popular: typeof e.popular === "boolean" ? e.popular : undefined,
    highlighted: typeof e.highlighted === "boolean" ? e.highlighted : undefined,
    frame: coerceFrame(e.frame),
    locked,
    visible,
    name,
  };
}

function dedupeElementIds(slides: Slide[]): Slide[] {
  const used = new Set<string>();
  return slides.map((slide) => {
    const elements = slide.elements.map((el, index) => {
      let id = el.id;
      if (!id || used.has(id)) {
        id = `${slide.id}_el_${index + 1}`;
      }
      while (used.has(id)) id = `${id}_${used.size}`;
      used.add(id);
      return { ...el, id };
    });
    return { ...slide, elements };
  });
}

function applyTemplateSlideDefaults(
  slides: Slide[],
  template: PresentationTemplate,
  theme: SlideGraph["meta"]["theme"]
): Slide[] {
  return slides.map((slide, index) => {
    const layout = template.slideStructure[index]?.layout ?? slide.layout;
    let background = slide.background;

    if (layout === "dark-solution" || layout === "cta-split") {
      background = { ...background, color: theme.primaryColor };
    } else if (layout === "dark-metrics") {
      background = { ...background, color: "#1A1A2E" };
    }

    return background !== slide.background ? { ...slide, background } : slide;
  });
}

function minimalElements(slideId: string, layout: SlideLayout): SlideElement[] {
  if (layout === "title") {
    return [
      { id: `${slideId}_heading`, type: "heading", content: "Презентация", visible: true },
      { id: `${slideId}_sub`, type: "subheading", content: "", visible: true },
    ];
  }
  return [{ id: `${slideId}_body`, type: "body", content: "", visible: true }];
}

function coerceSlide(
  raw: unknown,
  index: number,
  layoutFallback: SlideLayout,
  forceLayout?: boolean
): Slide | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  const id =
    typeof s.id === "string" && s.id.trim() ? s.id.trim() : `slide_${index + 1}`;
  const layout = forceLayout ? layoutFallback : coerceLayout(s.layout, layoutFallback);
  const elementsRaw = Array.isArray(s.elements) ? s.elements : [];
  let elements = elementsRaw
    .map((el, i) => coerceElement(el, i, id))
    .filter((el): el is SlideElement => el !== null);
  if (!elements.length) elements = minimalElements(id, layout);

  const backgroundRaw = s.background;
  let background: Slide["background"];
  if (backgroundRaw && typeof backgroundRaw === "object" && !Array.isArray(backgroundRaw)) {
    const b = backgroundRaw as Record<string, unknown>;
    let overlay: number | undefined;
    if (typeof b.overlay === "number" && Number.isFinite(b.overlay)) {
      overlay = Math.min(1, Math.max(0, b.overlay));
    }
    background = {
      color: typeof b.color === "string" ? b.color : undefined,
      gradient: typeof b.gradient === "string" ? b.gradient : undefined,
      image: typeof b.image === "string" ? b.image : undefined,
      overlay,
    };
    if (Object.values(background).every((v) => v === undefined)) background = undefined;
  }

  return {
    id,
    layout,
    background,
    elements,
    notes: typeof s.notes === "string" ? s.notes : undefined,
    freeform: typeof s.freeform === "boolean" ? s.freeform : undefined,
  };
}

export type NormalizeSlideGraphOptions = {
  template?: PresentationTemplate;
};

/** Приводит типичный «грязный» JSON от модели к схеме SlideGraph. */
export function normalizeSlideGraphPayload(
  raw: unknown,
  options?: NormalizeSlideGraphOptions
): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const g = raw as Record<string, unknown>;
  const template = options?.template;
  const fallbackTheme = template?.theme;

  const metaRaw = g.meta;
  const meta =
    metaRaw && typeof metaRaw === "object" && !Array.isArray(metaRaw)
      ? (metaRaw as Record<string, unknown>)
      : {};

  const themeRaw = meta.theme;
  const theme =
    themeRaw && typeof themeRaw === "object" && !Array.isArray(themeRaw)
      ? (themeRaw as Record<string, unknown>)
      : {};

  const defaultPrimary = fallbackTheme?.primaryColor ?? "#4F8EF7";
  const defaultBg = fallbackTheme?.backgroundColor ?? "#FFFFFF";
  const defaultText = fallbackTheme?.textColor ?? "#1A1A2E";
  const defaultFont = fallbackTheme?.fontFamily ?? "Inter, sans-serif";

  const slidesRaw = Array.isArray(g.slides) ? g.slides : [];
  const slideCount = template?.slideCount ?? slidesRaw.length;
  const slides: Slide[] = [];

  const forceTemplateLayouts = Boolean(template);

  for (let i = 0; i < slideCount; i++) {
    const layoutFallback =
      template?.slideStructure[i]?.layout ?? (i === 0 ? "title" : "content");
    const coerced = coerceSlide(slidesRaw[i], i, layoutFallback, forceTemplateLayouts);
    if (coerced) {
      slides.push(coerced);
    } else {
      slides.push({
        id: `slide_${i + 1}`,
        layout: layoutFallback,
        elements: minimalElements(`slide_${i + 1}`, layoutFallback),
      });
    }
  }

  if (!slides.length && slidesRaw.length) {
    for (let i = 0; i < slidesRaw.length; i++) {
      const coerced = coerceSlide(slidesRaw[i], i, i === 0 ? "title" : "content");
      if (coerced) slides.push(coerced);
    }
  }

  const versionRaw = g.version;
  const version =
    versionRaw === 1 || versionRaw === "1" || Number(versionRaw) === 1 ? 1 : 1;

  const themeNormalized = {
    primaryColor: coerceHexColor(theme.primaryColor, defaultPrimary),
    accentColor:
      typeof theme.accentColor === "string"
        ? theme.accentColor
        : fallbackTheme?.accentColor,
    backgroundColor: coerceHexColor(theme.backgroundColor, defaultBg),
    textColor: coerceHexColor(theme.textColor, defaultText),
    fontFamily:
      typeof theme.fontFamily === "string" && theme.fontFamily.trim()
        ? theme.fontFamily.trim()
        : defaultFont,
  };

  let slidesNormalized = dedupeElementIds(slides).map(clearMassLockedSlideElements);
  if (template) {
    slidesNormalized = applyTemplateSlideDefaults(slidesNormalized, template, themeNormalized);
  }

  return {
    version,
    meta: {
      title:
        typeof meta.title === "string" && meta.title.trim()
          ? meta.title.trim()
          : template?.name ?? "Presentation",
      language: coerceLanguage(meta.language),
      theme: themeNormalized,
      generatedAt:
        typeof meta.generatedAt === "string" ? meta.generatedAt : "",
      templateId:
        typeof meta.templateId === "string" && meta.templateId.trim()
          ? meta.templateId.trim()
          : template?.id,
    },
    slides: slidesNormalized,
  };
}

export function parseSlideGraphPayload(
  raw: unknown,
  options?: NormalizeSlideGraphOptions
) {
  const normalized = normalizeSlideGraphPayload(unwrapSlideGraphRoot(raw), options);
  return slideGraphSchema.safeParse(normalized);
}

export function formatSlideGraphZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 6)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}

export function parseSlideGraphFromAiText(
  text: string,
  options?: NormalizeSlideGraphOptions
) {
  const parsed = extractJsonFromAiText(text);
  if (!parsed) return null;
  return parseSlideGraphPayload(parsed, options);
}

export function loadSlideGraphFromJson(
  graphJson: string,
  options?: NormalizeSlideGraphOptions
) {
  let raw: unknown;
  try {
    raw = JSON.parse(graphJson) as unknown;
  } catch {
    return null;
  }
  return parseSlideGraphPayload(raw, options);
}

/** Парсит один слайд из ответа AI (op add). */
export function parseSlideFromAiText(
  text: string,
  options?: { layoutFallback?: SlideLayout; forbiddenIds?: Set<string> }
): Slide | null {
  const parsed = extractJsonFromAiText(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const root = parsed as Record<string, unknown>;
  let slideRaw: unknown = root;
  if (typeof root.id !== "string" || !root.layout) {
    for (const key of ["slide", "data"] as const) {
      const nested = root[key];
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        const n = nested as Record<string, unknown>;
        if (typeof n.id === "string" && n.layout) {
          slideRaw = nested;
          break;
        }
      }
    }
  }

  const layoutFallback = options?.layoutFallback ?? "content";
  const coerced = coerceSlide(slideRaw, 0, layoutFallback);
  if (!coerced) return null;

  const forbidden = options?.forbiddenIds;
  if (forbidden?.has(coerced.id)) {
    coerced.id = `slide_${Date.now()}`;
  }
  let suffix = 0;
  while (forbidden?.has(coerced.id)) {
    suffix += 1;
    coerced.id = `slide_${Date.now()}_${suffix}`;
  }

  const validated = slideGraphSchema.safeParse({
    version: 1 as const,
    meta: {
      title: "_",
      language: "ru",
      theme: {
        primaryColor: "#4F8EF7",
        backgroundColor: "#FFFFFF",
        textColor: "#1A1A2E",
        fontFamily: "Inter, sans-serif",
      },
      generatedAt: "",
    },
    slides: [coerced],
  });
  if (!validated.success) return null;
  return validated.data.slides[0] ?? null;
}
