import { z } from "zod";
import type { ComponentGraph } from "./types";

const styleTokensSchema = z.object({
  width: z.string().optional(),
  height: z.string().optional(),
  minHeight: z.string().optional(),
  padding: z.string().optional(),
  paddingX: z.string().optional(),
  paddingY: z.string().optional(),
  margin: z.string().optional(),
  display: z.enum(["flex", "grid", "block", "inline-block", "inline"]).optional(),
  flexDirection: z.enum(["row", "column", "row-reverse", "column-reverse"]).optional(),
  flexWrap: z.enum(["wrap", "nowrap"]).optional(),
  gap: z.string().optional(),
  alignItems: z.enum(["flex-start", "center", "flex-end", "stretch"]).optional(),
  justifyContent: z.enum(["flex-start", "center", "flex-end", "space-between", "space-around"]).optional(),
  gridColumns: z.number().int().min(1).max(12).optional(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  backgroundSize: z.enum(["cover", "contain", "auto"]).optional(),
  color: z.string().optional(),
  borderRadius: z.string().optional(),
  border: z.string().optional(),
  boxShadow: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  overflow: z.enum(["hidden", "visible", "auto", "scroll"]).optional(),
  fontSize: z.string().optional(),
  fontWeight: z.enum(["normal", "medium", "semibold", "bold"]).optional(),
  lineHeight: z.string().optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  letterSpacing: z.string().optional(),
  textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
}).strip();

const componentNodeTypeSchema = z.enum([
  "Section", "Container", "Row", "Column", "Grid",
  "Hero", "Features", "Pricing", "Testimonials", "FAQ", "CTA",
  "Header", "Footer", "Nav",
  "Text", "Heading", "Image", "Button", "Link", "Icon",
  "Video", "Form", "Card", "Divider", "Spacer",
]);

const animationSchema = z.object({
  type: z.enum(["fadeIn", "slideUp", "slideLeft", "zoom"]),
  delay: z.number().optional(),
  duration: z.number().optional(),
});

const componentNodeSchema: z.ZodType<import("./types").ComponentNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: componentNodeTypeSchema,
    label: z.string().optional(),
    props: z.record(z.unknown()),
    styles: styleTokensSchema,
    responsiveStyles: z
      .object({
        tablet: styleTokensSchema.partial().optional(),
        mobile: styleTokensSchema.partial().optional(),
      })
      .optional(),
    animation: animationSchema.optional(),
    children: z.array(componentNodeSchema).optional(),
  })
);

const themeTokensSchema = z.object({
  primaryColor: z.string(),
  accentColor: z.string().optional(),
  backgroundColor: z.string(),
  textColor: z.string(),
  fontFamily: z.string(),
  borderRadius: z.string(),
  maxWidth: z.string(),
});

const componentPageSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(componentNodeSchema).min(1),
});

export const componentGraphSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    projectName: z.string().min(1),
    language: z.string().min(2).max(5),
    theme: themeTokensSchema,
    generatedAt: z.string(),
  }),
  pages: z.array(componentPageSchema).min(1),
}) satisfies z.ZodType<ComponentGraph>;

export type ComponentGraphInput = z.input<typeof componentGraphSchema>;
