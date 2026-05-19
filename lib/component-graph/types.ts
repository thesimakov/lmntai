export type ComponentNodeType =
  | "Section" | "Container" | "Row" | "Column" | "Grid"
  | "Hero" | "Features" | "Pricing" | "Testimonials" | "FAQ" | "CTA"
  | "Header" | "Footer" | "Nav"
  | "Text" | "Heading" | "Image" | "Button" | "Link" | "Icon"
  | "Video" | "Form" | "Card" | "Divider" | "Spacer"
  | "Stats" | "Logos" | "Team" | "Timeline";

export interface StyleTokens {
  width?: string;
  height?: string;
  minHeight?: string;
  padding?: string;
  paddingX?: string;
  paddingY?: string;
  margin?: string;
  display?: "flex" | "grid" | "block" | "inline-block" | "inline";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap?: "wrap" | "nowrap";
  gap?: string;
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
  gridColumns?: number;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: "cover" | "contain" | "auto";
  color?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  opacity?: number;
  overflow?: "hidden" | "visible" | "auto" | "scroll";
  fontSize?: string;
  fontWeight?: "normal" | "medium" | "semibold" | "bold";
  lineHeight?: string;
  textAlign?: "left" | "center" | "right";
  letterSpacing?: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface ThemeTokens {
  primaryColor: string;
  accentColor?: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  maxWidth: string;
}

export interface AnimationConfig {
  type: "fadeIn" | "slideUp" | "slideLeft" | "zoom";
  delay?: number;
  duration?: number;
}

export interface ComponentNode {
  id: string;
  type: ComponentNodeType;
  label?: string;
  props: Record<string, unknown>;
  styles: StyleTokens;
  responsiveStyles?: {
    tablet?: Partial<StyleTokens>;
    mobile?: Partial<StyleTokens>;
  };
  animation?: AnimationConfig;
  children?: ComponentNode[];
}

export interface ComponentPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  nodes: ComponentNode[];
}

export interface ComponentGraph {
  version: 1;
  meta: {
    projectName: string;
    language: string;
    theme: ThemeTokens;
    generatedAt: string;
  };
  pages: ComponentPage[];
}
