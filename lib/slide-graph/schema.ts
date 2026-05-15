import { z } from "zod";
import type { SlideGraph } from "./types";

const slideElementStyleSchema = z.object({
  color: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  italic: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

const slideElementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["heading", "subheading", "body", "bullet-list", "image", "quote", "caption", "label"]),
  content: z.string().optional(),
  items: z.array(z.string()).optional(),
  src: z.string().optional(),
  alt: z.string().optional(),
  style: slideElementStyleSchema.optional(),
});

const slideBackgroundSchema = z.object({
  color: z.string().optional(),
  image: z.string().optional(),
  overlay: z.number().min(0).max(1).optional(),
});

const slideSchema = z.object({
  id: z.string().min(1),
  layout: z.enum(["title", "content", "two-column", "image-left", "image-right", "blank", "quote", "section-divider"]),
  background: slideBackgroundSchema.optional(),
  elements: z.array(slideElementSchema).min(1),
  notes: z.string().optional(),
});

const slideThemeSchema = z.object({
  primaryColor: z.string(),
  accentColor: z.string().optional(),
  backgroundColor: z.string(),
  textColor: z.string(),
  fontFamily: z.string(),
});

export const slideGraphSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    title: z.string().min(1),
    language: z.string().min(2).max(5),
    theme: slideThemeSchema,
    generatedAt: z.string(),
  }),
  slides: z.array(slideSchema).min(1),
}) satisfies z.ZodType<SlideGraph>;

export type SlideGraphInput = z.input<typeof slideGraphSchema>;
