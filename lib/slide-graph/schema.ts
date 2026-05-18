import { z } from "zod";
import type { SlideGraph } from "./types";

const slideElementFrameSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().min(24),
  h: z.number().min(24),
  zIndex: z.number().optional(),
});

const slideElementStyleSchema = z.object({
  color: z.string().optional(),
  labelColor: z.string().optional(),
  descriptionColor: z.string().optional(),
  valueColor: z.string().optional(),
  changeColor: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  italic: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

const slideElementSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "heading", "subheading", "body", "bullet-list", "image", "quote", "caption", "label",
    "metric-card", "feature-card", "step-card", "stat-number", "pricing-card", "timeline-col",
  ]),
  // Basic
  content: z.string().optional(),
  items: z.array(z.string()).optional(),
  src: z.string().optional(),
  alt: z.string().optional(),
  style: slideElementStyleSchema.optional(),
  // metric-card / stat-number
  value: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  change: z.string().optional(),
  // feature-card
  badge: z.string().optional(),
  iconKeyword: z.string().optional(),
  // step-card
  stepNumber: z.number().optional(),
  // pricing-card
  planName: z.string().optional(),
  price: z.string().optional(),
  period: z.string().optional(),
  features: z.array(z.string()).optional(),
  popular: z.boolean().optional(),
  // timeline-col
  highlighted: z.boolean().optional(),
  frame: slideElementFrameSchema.optional(),
});

const slideBackgroundSchema = z.object({
  color: z.string().optional(),
  gradient: z.string().optional(),
  image: z.string().optional(),
  overlay: z.number().min(0).max(1).optional(),
});

const slideSchema = z.object({
  id: z.string().min(1),
  layout: z.enum([
    "title", "content", "two-column", "image-left", "image-right", "blank", "quote", "section-divider",
    "metrics-cards", "dark-solution", "steps-grid", "feature-grid-6", "dark-metrics",
    "pricing-3col", "market-split", "timeline-4col", "cta-split",
  ]),
  background: slideBackgroundSchema.optional(),
  elements: z.array(slideElementSchema).min(1),
  notes: z.string().optional(),
  freeform: z.boolean().optional(),
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
    templateId: z.string().optional(),
  }),
  slides: z.array(slideSchema).min(1),
}) satisfies z.ZodType<SlideGraph>;

export type SlideGraphInput = z.input<typeof slideGraphSchema>;
