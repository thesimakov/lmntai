import type { ComponentNode, ComponentNodeType, StyleTokens } from "./types";
import { componentGraphSchema } from "./schema";

const NODE_TYPES: ComponentNodeType[] = [
  "Section",
  "Container",
  "Row",
  "Column",
  "Grid",
  "Hero",
  "Features",
  "Pricing",
  "Testimonials",
  "FAQ",
  "CTA",
  "Header",
  "Footer",
  "Nav",
  "Text",
  "Heading",
  "Image",
  "Button",
  "Link",
  "Icon",
  "Video",
  "Form",
  "Card",
  "Divider",
  "Spacer",
  "Stats",
  "Logos",
  "Team",
  "Timeline",
];

const NODE_TYPE_SET = new Set<string>(NODE_TYPES);

const FONT_WEIGHT_MAP: Record<string, StyleTokens["fontWeight"]> = {
  normal: "normal",
  medium: "medium",
  semibold: "semibold",
  bold: "bold",
  "400": "normal",
  "500": "medium",
  "600": "semibold",
  "700": "bold",
  "800": "bold",
};

function coerceNodeType(raw: unknown): ComponentNodeType {
  if (typeof raw !== "string" || !raw.trim()) return "Section";
  const t = raw.trim();
  if (NODE_TYPE_SET.has(t)) return t as ComponentNodeType;
  const pascal = t.charAt(0).toUpperCase() + t.slice(1);
  if (NODE_TYPE_SET.has(pascal)) return pascal as ComponentNodeType;
  const lower = t.toLowerCase();
  const match = NODE_TYPES.find((n) => n.toLowerCase() === lower);
  return match ?? "Section";
}

function coerceStyleTokens(raw: unknown): StyleTokens {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(src)) {
    if (value === null || value === undefined) continue;

    if (key === "fontWeight") {
      const fw =
        typeof value === "number"
          ? FONT_WEIGHT_MAP[String(value)]
          : FONT_WEIGHT_MAP[String(value).toLowerCase()];
      if (fw) out.fontWeight = fw;
      continue;
    }

    if (key === "gridColumns") {
      const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 12) out.gridColumns = Math.trunc(n);
      continue;
    }

    if (key === "opacity") {
      const n = typeof value === "number" ? value : Number.parseFloat(String(value));
      if (Number.isFinite(n)) out.opacity = Math.min(1, Math.max(0, n));
      continue;
    }

    if (key === "display" && value === "inline-flex") {
      out.display = "flex";
      continue;
    }

    out[key] = value;
  }

  return out as StyleTokens;
}

export function coerceNode(raw: unknown): ComponentNode | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const n = raw as Record<string, unknown>;
  const id = typeof n.id === "string" && n.id.trim() ? n.id.trim() : null;
  if (!id) return null;

  const childrenRaw = n.children;
  const children = Array.isArray(childrenRaw)
    ? childrenRaw.map(coerceNode).filter((c): c is ComponentNode => c !== null)
    : undefined;

  const responsive = n.responsiveStyles;
  let responsiveStyles: ComponentNode["responsiveStyles"];
  if (responsive && typeof responsive === "object" && !Array.isArray(responsive)) {
    const r = responsive as Record<string, unknown>;
    responsiveStyles = {
      tablet: r.tablet ? coerceStyleTokens(r.tablet) : undefined,
      mobile: r.mobile ? coerceStyleTokens(r.mobile) : undefined,
    };
  }

  let animation: ComponentNode["animation"];
  if (n.animation && typeof n.animation === "object" && !Array.isArray(n.animation)) {
    const a = n.animation as Record<string, unknown>;
    const type = a.type;
    if (type === "fadeIn" || type === "slideUp" || type === "slideLeft" || type === "zoom") {
      animation = {
        type,
        delay: typeof a.delay === "number" ? a.delay : undefined,
        duration: typeof a.duration === "number" ? a.duration : undefined,
      };
    }
  }

  return {
    id,
    type: coerceNodeType(n.type),
    label: typeof n.label === "string" ? n.label : undefined,
    props:
      n.props && typeof n.props === "object" && !Array.isArray(n.props)
        ? (n.props as Record<string, unknown>)
        : {},
    styles: coerceStyleTokens(n.styles),
    responsiveStyles,
    animation,
    children: children?.length ? children : undefined,
  };
}

function coerceHexColor(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (/^#[0-9A-Fa-f]{3,8}$/.test(t)) return t;
  return fallback;
}

/** Приводит типичный «грязный» JSON от модели к схеме ComponentGraph. */
export function normalizeComponentGraphPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const g = raw as Record<string, unknown>;

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

  const pagesRaw = Array.isArray(g.pages) ? g.pages : [];
  const pages = pagesRaw
    .map((page) => {
      if (!page || typeof page !== "object" || Array.isArray(page)) return null;
      const p = page as Record<string, unknown>;
      const nodesRaw = Array.isArray(p.nodes) ? p.nodes : [];
      const nodes = nodesRaw.map(coerceNode).filter((n): n is ComponentNode => n !== null);
      if (!nodes.length) return null;
      const slug =
        typeof p.slug === "string" && p.slug.trim() ? p.slug.trim() : "index";
      return {
        id: typeof p.id === "string" && p.id.trim() ? p.id.trim() : slug,
        slug,
        title:
          typeof p.title === "string" && p.title.trim()
            ? p.title.trim()
            : "Home",
        description:
          typeof p.description === "string" ? p.description : undefined,
        nodes,
      };
    })
    .filter(Boolean);

  const langRaw = typeof meta.language === "string" ? meta.language : "ru";
  const language = langRaw.trim().slice(0, 5) || "ru";

  return {
    version: 1,
    meta: {
      projectName:
        typeof meta.projectName === "string" && meta.projectName.trim()
          ? meta.projectName.trim()
          : "Website",
      language,
      theme: {
        primaryColor: coerceHexColor(theme.primaryColor, "#4F8EF7"),
        accentColor:
          typeof theme.accentColor === "string"
            ? (/^#[0-9A-Fa-f]{3,8}$/.test(theme.accentColor.trim()) ? theme.accentColor.trim() : undefined)
            : undefined,
        backgroundColor: coerceHexColor(theme.backgroundColor, "#FFFFFF"),
        textColor: coerceHexColor(theme.textColor, "#1A1A2E"),
        fontFamily:
          typeof theme.fontFamily === "string" && theme.fontFamily.trim()
            ? theme.fontFamily.trim()
            : "Inter, sans-serif",
        borderRadius:
          typeof theme.borderRadius === "string" && theme.borderRadius.trim()
            ? theme.borderRadius.trim()
            : "8px",
        maxWidth:
          typeof theme.maxWidth === "string" && theme.maxWidth.trim()
            ? theme.maxWidth.trim()
            : "1200px",
      },
      generatedAt:
        typeof meta.generatedAt === "string" && meta.generatedAt.trim()
          ? meta.generatedAt.trim()
          : new Date().toISOString(),
    },
    pages,
  };
}

export function parseComponentGraphFromAiText(text: string) {
  try {
    let json = text.trim();
    const fence = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) json = fence[1].trim();
    const parsed = JSON.parse(json) as unknown;
    return componentGraphSchema.safeParse(normalizeComponentGraphPayload(parsed));
  } catch {
    return null;
  }
}
