export type SlideLayout =
  | "title"
  | "content"
  | "two-column"
  | "image-left"
  | "image-right"
  | "blank"
  | "quote"
  | "section-divider";

export type SlideElementType =
  | "heading"
  | "subheading"
  | "body"
  | "bullet-list"
  | "image"
  | "quote"
  | "caption"
  | "label";

export interface SlideElementStyle {
  color?: string;
  fontSize?: string;
  fontWeight?: "normal" | "bold";
  textAlign?: "left" | "center" | "right";
  italic?: boolean;
  opacity?: number;
}

export interface SlideElement {
  id: string;
  type: SlideElementType;
  content?: string;
  items?: string[];
  src?: string;
  alt?: string;
  style?: SlideElementStyle;
}

export interface SlideBackground {
  color?: string;
  image?: string;
  overlay?: number;
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  background?: SlideBackground;
  elements: SlideElement[];
  notes?: string;
}

export interface SlideTheme {
  primaryColor: string;
  accentColor?: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

export interface SlideGraph {
  version: 1;
  meta: {
    title: string;
    language: string;
    theme: SlideTheme;
    generatedAt: string;
  };
  slides: Slide[];
}
