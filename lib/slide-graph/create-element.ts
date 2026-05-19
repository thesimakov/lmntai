import type { SlideElement, SlideElementType, SlideTheme } from "./types";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H, clampFrame, defaultElementFrame } from "./freeform";

export type InsertTextKind = "heading" | "subheading" | "body" | "bullet-list";
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

const TEXT_DEFAULTS: Record<
  InsertTextKind,
  { content: string; items?: string[]; fontSize?: string; fontWeight?: "bold" }
> = {
  heading: { content: "Заголовок", fontSize: "2.25rem", fontWeight: "bold" },
  subheading: { content: "Подзаголовок", fontSize: "1.15rem" },
  body: { content: "Текст", fontSize: "1.05rem" },
  "bullet-list": { content: "", items: ["Пункт 1", "Пункт 2", "Пункт 3"] },
};

export function createTextElement(
  kind: InsertTextKind,
  elementIndex: number,
  theme: SlideTheme
): SlideElement {
  const defaults = TEXT_DEFAULTS[kind];
  return {
    id: newElementId(),
    type: kind,
    content: defaults.content,
    ...(defaults.items ? { items: defaults.items } : {}),
    frame: stackedCenterFrame(elementIndex, kind),
    style: {
      color: theme.textColor,
      fontSize: defaults.fontSize,
      fontWeight: defaults.fontWeight,
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
