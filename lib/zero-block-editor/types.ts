export const ZB_BREAKPOINTS = ["desktop", "1200", "980", "640", "480", "320"] as const;
export type ZbBreakpoint = (typeof ZB_BREAKPOINTS)[number];

export const ZB_BREAKPOINT_WIDTHS: Record<ZbBreakpoint, number> = {
  desktop: 1920,
  "1200": 1200,
  "980": 980,
  "640": 640,
  "480": 480,
  "320": 320,
};

export type ZbElementType =
  | "text"
  | "image"
  | "shape"
  | "button"
  | "vector"
  | "video"
  | "html"
  | "tooltip"
  | "form"
  | "gallery";

export type ZbShapeType = "rectangle" | "circle" | "line";

export interface ZbTextProps {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  textAlign: "left" | "center" | "right";
  autoHeight: boolean;
  hyperlink?: string;
  textShadow?: string;
  hoverColor?: string;
}

export interface ZbImageProps {
  src: string;
  alt: string;
  objectFit: "cover" | "contain";
  borderRadius: number;
  boxShadow?: string;
  lazyLoad: boolean;
  link?: string;
  parallax?: boolean;
}

export interface ZbShapeProps {
  shapeType: ZbShapeType;
  fill: string;
  gradient?: string;
  border?: string;
  borderRadius: number;
}

export interface ZbButtonProps {
  text: string;
  link: string;
  targetBlank: boolean;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: number;
  fontWeight: number;
  border?: string;
  hoverBackground?: string;
  hoverTextColor?: string;
  action: "link" | "scroll" | "popup";
  scrollTarget?: string;
}

export interface ZbVectorProps {
  svgContent: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface ZbVideoProps {
  url: string;
  videoType: "youtube" | "vimeo" | "mp4";
  autoplay: boolean;
  muted: boolean;
  controls: boolean;
  loop: boolean;
  posterImage?: string;
}

export interface ZbHtmlProps {
  html: string;
  css: string;
  js: string;
}

export interface ZbTooltipProps {
  triggerText: string;
  content: string;
  trigger: "hover" | "click";
  delay: number;
  position: "top" | "bottom" | "left" | "right";
}

export interface ZbFormField {
  id: string;
  fieldType: "input" | "textarea" | "select" | "checkbox" | "radio";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface ZbFormProps {
  fields: ZbFormField[];
  submitText: string;
  successMessage: string;
  action?: string;
}

export interface ZbGalleryProps {
  images: string[];
  layout: "slider" | "grid" | "masonry";
  lightbox: boolean;
  autoplay: boolean;
  arrows: boolean;
  autoplayInterval?: number;
}

export type ZbElementProps =
  | ZbTextProps
  | ZbImageProps
  | ZbShapeProps
  | ZbButtonProps
  | ZbVectorProps
  | ZbVideoProps
  | ZbHtmlProps
  | ZbTooltipProps
  | ZbFormProps
  | ZbGalleryProps;

export interface ZbAnimationConfig {
  animType: "fade" | "slide" | "zoom" | "parallax";
  delay: number;
  duration: number;
  trigger: "scroll" | "load";
  direction?: "up" | "down" | "left" | "right";
  easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
}

export interface ZbResponsiveOverride {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  visible?: boolean;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
}

export interface ZbElement {
  id: string;
  type: ZbElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  opacity: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  name: string;
  props: Record<string, unknown>;
  responsive: Partial<Record<ZbBreakpoint, ZbResponsiveOverride>>;
  animation: ZbAnimationConfig | null;
}

export interface ZbCanvasConfig {
  gridWidth: number;
  canvasWidth: number | null; // null = full viewport (desktop)
  height: number;
  background: string;
  backgroundImage?: string;
  columns: number;
  snapToGrid: boolean;
  snapToElements: boolean;
  showGuides: boolean;
  showColumns: boolean;
  zoom: number;
}

export interface ZbSnapGuide {
  orientation: "h" | "v";
  position: number;
}

export type ZbResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
