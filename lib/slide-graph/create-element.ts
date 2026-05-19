import { defaultLabelElementStyle } from "./label-style";
import type { SlideElement, SlideElementType, SlideTheme } from "./types";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H, clampFrame, defaultElementFrame } from "./freeform";

/** Presets shown in the text insert picker (toolbar). */
export type InsertTextPreset =
  | "title"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "heading-4"
  | "quote"
  | "label"
  | "body"
  | "bullet-list";

/** @deprecated Use InsertTextPreset */
export type InsertTextKind = InsertTextPreset;

export type InsertShapeKind = "rect" | "ellipse" | "rounded-rect";
export type InsertLineKind = "horizontal" | "vertical";

function newElementId(): string {
  return `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function stackedCenterFrame(
  index: number,
  type: SlideElementType,
  overrides?: Partial<{ w: number; h: number }>
) {
  const base = defaultElementFrame(index, type);
  const w = overrides?.w ?? base.w;
  const h = overrides?.h ?? base.h;
  const stack = (index % 6) * 14;
  return clampFrame({
    x: Math.round((SLIDE_CANVAS_W - w) / 2 + stack),
    y: Math.round((SLIDE_CANVAS_H - h) / 2 + stack),
    w,
    h,
    zIndex: index + 1,
  });
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function shapeImageSrc(
  shape: InsertShapeKind,
  fill: string,
  w: number,
  h: number
): string {
  if (shape === "ellipse") {
    return svgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}"/></svg>`
    );
  }
  const rx = shape === "rounded-rect" ? 16 : 0;
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${rx}" fill="${fill}"/></svg>`
  );
}

function lineImageSrc(kind: InsertLineKind, color: string): { src: string; w: number; h: number } {
  if (kind === "vertical") {
    return {
      w: 6,
      h: 160,
      src: svgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="6" height="160"><line x1="3" y1="0" x2="3" y2="160" stroke="${color}" stroke-width="3" stroke-linecap="round"/></svg>`
      ),
    };
  }
  return {
    w: 200,
    h: 6,
    src: svgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="6"><line x1="0" y1="3" x2="200" y2="3" stroke="${color}" stroke-width="3" stroke-linecap="round"/></svg>`
    ),
  };
}

export function placeholderImageSrc(): string {
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <rect x="1" y="1" width="318" height="198" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="8 6"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-family="Inter,sans-serif" font-size="14">Изображение</text>
    </svg>`
  );
}

type TextPresetDef = {
  type: SlideElementType;
  content: string;
  items?: string[];
  fontSize?: string;
  fontWeight?: "bold";
  frame?: { w: number; h: number };
};

const TEXT_PRESETS: Record<InsertTextPreset, TextPresetDef> = {
  title: {
    type: "heading",
    content: "Название",
    fontSize: "3rem",
    fontWeight: "bold",
    frame: { w: 680, h: 96 },
  },
  "heading-1": {
    type: "heading",
    content: "Заголовок 1",
    fontSize: "2.25rem",
    fontWeight: "bold",
    frame: { w: 640, h: 80 },
  },
  "heading-2": {
    type: "subheading",
    content: "Заголовок 2",
    fontSize: "1.5rem",
    fontWeight: "bold",
    frame: { w: 560, h: 56 },
  },
  "heading-3": {
    type: "body",
    content: "Заголовок 3",
    fontSize: "1.25rem",
    fontWeight: "bold",
    frame: { w: 520, h: 48 },
  },
  "heading-4": {
    type: "caption",
    content: "Заголовок 4",
    fontSize: "1.05rem",
    frame: { w: 400, h: 40 },
  },
  quote: {
    type: "quote",
    content: "Цитата",
    frame: { w: 480, h: 100 },
  },
  label: {
    type: "label",
    content: "Этикетка",
    frame: { w: 200, h: 40 },
  },
  body: {
    type: "body",
    content: "Текст",
    fontSize: "1.05rem",
    frame: { w: 560, h: 120 },
  },
  "bullet-list": {
    type: "bullet-list",
    content: "",
    items: ["Пункт 1", "Пункт 2", "Пункт 3"],
    frame: { w: 520, h: 160 },
  },
};

export function createTextElement(
  preset: InsertTextPreset,
  elementIndex: number,
  theme: SlideTheme
): SlideElement {
  const def = TEXT_PRESETS[preset];
  const labelStyle = def.type === "label" ? defaultLabelElementStyle(theme) : undefined;
  return {
    id: newElementId(),
    type: def.type,
    content: def.content,
    ...(def.items ? { items: def.items } : {}),
    frame: stackedCenterFrame(elementIndex, def.type, def.frame),
    style: labelStyle ?? {
      color: theme.textColor,
      ...(def.fontSize ? { fontSize: def.fontSize } : {}),
      ...(def.fontWeight ? { fontWeight: def.fontWeight } : {}),
    },
    locked: false,
    visible: true,
  };
}

export function createImageElement(elementIndex: number): SlideElement {
  return {
    id: newElementId(),
    type: "image",
    src: placeholderImageSrc(),
    alt: "Изображение",
    frame: stackedCenterFrame(elementIndex, "image"),
    locked: false,
    visible: true,
  };
}

export function createShapeElement(
  shape: InsertShapeKind,
  elementIndex: number,
  theme: SlideTheme
): SlideElement {
  const w = shape === "ellipse" ? 120 : 160;
  const h = shape === "ellipse" ? 120 : 100;
  const fill = theme.primaryColor ?? "#2563eb";
  return {
    id: newElementId(),
    type: "image",
    src: shapeImageSrc(shape, fill, w, h),
    alt: shape === "ellipse" ? "Круг" : "Фигура",
    frame: stackedCenterFrame(elementIndex, "image", { w, h }),
    locked: false,
    visible: true,
  };
}

export function createLineElement(
  kind: InsertLineKind,
  elementIndex: number,
  theme: SlideTheme
): SlideElement {
  const color = theme.textColor ?? "#1a1a2e";
  const { src, w, h } = lineImageSrc(kind, color);
  return {
    id: newElementId(),
    type: "image",
    src,
    alt: kind === "vertical" ? "Линия" : "Линия",
    frame: stackedCenterFrame(elementIndex, "image", { w, h }),
    locked: false,
    visible: true,
  };
}
