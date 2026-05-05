import type { CSSProperties } from "react";

export type Breakpoint = "desktop" | "tablet" | "mobile";
export type BlockType =
  | "text"
  | "image"
  | "gallery"
  | "button"
  | "form"
  | "cover"
  | "columns"
  | "zeroBlock";

export type JsonStyle = Partial<
  Pick<
    CSSProperties,
    | "background"
    | "backgroundColor"
    | "color"
    | "fontSize"
    | "fontWeight"
    | "padding"
    | "margin"
    | "textAlign"
    | "borderRadius"
    | "gap"
    | "minHeight"
    | "width"
    | "height"
    | "objectFit"
    | "display"
    | "justifyContent"
    | "alignItems"
    | "position"
    | "left"
    | "top"
  >
>;

export type ZeroElement = {
  id: string;
  type: "text" | "button" | "image";
  props: Record<string, string>;
  styles: JsonStyle;
};

export type BlockNode = {
  id: string;
  type: BlockType;
  props: Record<string, string | string[] | ZeroElement[]>;
  styles: JsonStyle;
  responsiveStyles?: Partial<Record<Breakpoint, JsonStyle>>;
  children?: BlockNode[];
};

/** Снимок HTML/CSS визуального конструктора Lemnity Box (холст). */
export type LemnityBoxCanvasContent = {
  html: string;
  css: string;
};

export type PageDocument = {
  version: 1;
  title: string;
  blocks: BlockNode[];
  /** Сохранённые данные конструктора; ключ в JSON сохранён исторически. */
  grapesjs?: LemnityBoxCanvasContent;
};

export function createId(prefix = "blk") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyPageDocument(title = "Страница без названия"): PageDocument {
  return {
    version: 1,
    title,
    blocks: [],
  };
}
