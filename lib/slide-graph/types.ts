export type SlideLayout =
  | "title"
  | "content"
  | "two-column"
  | "image-left"
  | "image-right"
  | "blank"
  | "quote"
  | "section-divider"
  // Rich template layouts
  | "metrics-cards"
  | "dark-solution"
  | "steps-grid"
  | "feature-grid-6"
  | "dark-metrics"
  | "pricing-3col"
  | "market-split"
  | "timeline-4col"
  | "cta-split";

export type SlideElementType =
  | "heading"
  | "subheading"
  | "body"
  | "bullet-list"
  | "image"
  | "quote"
  | "caption"
  | "label"
  // Rich element types for template slides
  | "metric-card"
  | "feature-card"
  | "step-card"
  | "stat-number"
  | "pricing-card"
  | "timeline-col";

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
  // Basic text elements
  content?: string;
  items?: string[];
  src?: string;
  alt?: string;
  style?: SlideElementStyle;
  // metric-card / stat-number fields
  value?: string;
  label?: string;
  description?: string;
  change?: string;
  // feature-card fields
  badge?: string;
  iconKeyword?: string;
  // step-card fields
  stepNumber?: number;
  // pricing-card fields
  planName?: string;
  price?: string;
  period?: string;
  features?: string[];
  popular?: boolean;
  // timeline-col fields
  highlighted?: boolean;
}

export interface SlideBackground {
  color?: string;
  gradient?: string;
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
    templateId?: string;
  };
  slides: Slide[];
}
