import { z } from "zod";
import type { Slide, SlideBackground, SlideElement, SlideGraph } from "./types";

const slideElementStyleSchema = z.object({
  color: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  italic: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const slideElementInputSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "heading",
    "subheading",
    "body",
    "bullet-list",
    "image",
    "quote",
    "caption",
    "label",
    "metric-card",
    "feature-card",
    "step-card",
    "stat-number",
    "pricing-card",
    "timeline-col",
  ]),
  content: z.string().optional(),
  items: z.array(z.string()).optional(),
  src: z.string().optional(),
  alt: z.string().optional(),
  style: slideElementStyleSchema.optional(),
  value: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  change: z.string().optional(),
  badge: z.string().optional(),
  iconKeyword: z.string().optional(),
  stepNumber: z.number().optional(),
  planName: z.string().optional(),
  price: z.string().optional(),
  period: z.string().optional(),
  features: z.array(z.string()).optional(),
  popular: z.boolean().optional(),
  highlighted: z.boolean().optional(),
});

const slideBackgroundInputSchema = z.object({
  color: z.string().optional(),
  gradient: z.string().optional(),
  image: z.string().optional(),
  overlay: z.number().min(0).max(1).optional(),
});

export const slidePatchSchema = z
  .object({
    slideId: z.string().min(1),
    elemId: z.string().min(1),
    content: z.string().optional(),
    items: z.array(z.string()).optional(),
    src: z.string().optional(),
    alt: z.string().optional(),
    style: slideElementStyleSchema.optional(),
    value: z.string().optional(),
    label: z.string().optional(),
    description: z.string().optional(),
    change: z.string().optional(),
    badge: z.string().optional(),
    iconKeyword: z.string().optional(),
    stepNumber: z.number().optional(),
    planName: z.string().optional(),
    price: z.string().optional(),
    period: z.string().optional(),
    features: z.array(z.string()).optional(),
    popular: z.boolean().optional(),
    highlighted: z.boolean().optional(),
  });

export const slidePatchBodySchema = z
  .object({
    patches: z.array(slidePatchSchema).min(1).optional(),
    slideBackground: z
      .object({
        slideId: z.string().min(1),
        background: slideBackgroundInputSchema,
      })
      .optional(),
    addElement: z
      .object({
        slideId: z.string().min(1),
        element: slideElementInputSchema,
      })
      .optional(),
    deleteElement: z
      .object({
        slideId: z.string().min(1),
        elemId: z.string().min(1),
      })
      .optional(),
    reorderElements: z
      .object({
        slideId: z.string().min(1),
        elemIds: z.array(z.string().min(1)).min(1),
      })
      .optional(),
    clearAll: z.literal(true).optional(),
  })
  .refine(
    (body) =>
      Boolean(
        body.patches?.length ||
          body.slideBackground ||
          body.addElement ||
          body.deleteElement ||
          body.reorderElements ||
          body.clearAll
      ),
    { message: "At least one patch operation is required" }
  );

export const slidePatchResponseSchema = z.object({
  message: z.string().min(1),
  patches: z.array(slidePatchSchema).min(1),
});

export type SlidePatch = z.infer<typeof slidePatchSchema>;
export type SlidePatchBody = z.infer<typeof slidePatchBodySchema>;
export type SlidePatchResponse = z.infer<typeof slidePatchResponseSchema>;

const PATCH_FIELD_KEYS = [
  "content",
  "items",
  "src",
  "alt",
  "style",
  "value",
  "label",
  "description",
  "change",
  "badge",
  "iconKeyword",
  "stepNumber",
  "planName",
  "price",
  "period",
  "features",
  "popular",
  "highlighted",
] as const satisfies ReadonlyArray<keyof SlidePatch>;

function patchFieldsToElementUpdate(patch: SlidePatch): Partial<SlideElement> {
  const update: Partial<SlideElement> = {};
  for (const key of PATCH_FIELD_KEYS) {
    if (patch[key] !== undefined) {
      (update as Record<string, unknown>)[key] = patch[key];
    }
  }
  return update;
}

export function applySlidePatches(graph: SlideGraph, patches: SlidePatch[]): SlideGraph {
  const slideMap = new Map(graph.slides.map((s) => [s.id, s]));

  for (const patch of patches) {
    const slide = slideMap.get(patch.slideId);
    if (!slide) continue;
    const update = patchFieldsToElementUpdate(patch);
    const elements = slide.elements.map((el): SlideElement => {
      if (el.id !== patch.elemId) return el;
      return { ...el, ...update };
    });
    slideMap.set(patch.slideId, { ...slide, elements });
  }

  return { ...graph, slides: graph.slides.map((s) => slideMap.get(s.id) ?? s) };
}

export function applySlideBackgroundPatch(
  graph: SlideGraph,
  slideId: string,
  background: SlideBackground
): SlideGraph {
  return {
    ...graph,
    slides: graph.slides.map((slide) =>
      slide.id === slideId
        ? { ...slide, background: { ...slide.background, ...background } }
        : slide
    ),
  };
}

export function applyAddElementPatch(
  graph: SlideGraph,
  slideId: string,
  element: SlideElement
): SlideGraph {
  return {
    ...graph,
    slides: graph.slides.map((slide) =>
      slide.id === slideId
        ? { ...slide, elements: [...slide.elements, element] }
        : slide
    ),
  };
}

export function applyDeleteElementPatch(
  graph: SlideGraph,
  slideId: string,
  elemId: string
): SlideGraph {
  return {
    ...graph,
    slides: graph.slides.map((slide) =>
      slide.id === slideId
        ? { ...slide, elements: slide.elements.filter((el) => el.id !== elemId) }
        : slide
    ),
  };
}

export function applyReorderElementsPatch(
  graph: SlideGraph,
  slideId: string,
  elemIds: string[]
): SlideGraph {
  return {
    ...graph,
    slides: graph.slides.map((slide): Slide => {
      if (slide.id !== slideId) return slide;
      const byId = new Map(slide.elements.map((el) => [el.id, el]));
      const reordered = elemIds
        .map((id) => byId.get(id))
        .filter((el): el is SlideElement => el !== undefined);
      const remaining = slide.elements.filter((el) => !elemIds.includes(el.id));
      return { ...slide, elements: [...reordered, ...remaining] };
    }),
  };
}

export function applySlidePatchBody(graph: SlideGraph, body: SlidePatchBody): SlideGraph {
  let next = graph;

  if (body.patches?.length) {
    next = applySlidePatches(next, body.patches);
  }
  if (body.slideBackground) {
    next = applySlideBackgroundPatch(
      next,
      body.slideBackground.slideId,
      body.slideBackground.background
    );
  }
  if (body.addElement) {
    next = applyAddElementPatch(
      next,
      body.addElement.slideId,
      body.addElement.element as SlideElement
    );
  }
  if (body.deleteElement) {
    next = applyDeleteElementPatch(
      next,
      body.deleteElement.slideId,
      body.deleteElement.elemId
    );
  }
  if (body.reorderElements) {
    next = applyReorderElementsPatch(
      next,
      body.reorderElements.slideId,
      body.reorderElements.elemIds
    );
  }

  return next;
}
