import { z } from "zod";
import { applyFramesToSlide, clampFrame } from "./freeform";
import type { Slide, SlideBackground, SlideElement, SlideElementFrame, SlideGraph } from "./types";

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
  frame: slideElementFrameSchema.optional(),
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
    name: z.string().optional(),
    locked: z.boolean().optional(),
    visible: z.boolean().optional(),
    frame: slideElementFrameSchema.optional(),
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
    initElementFrames: z
      .object({
        slideId: z.string().min(1),
        frames: z
          .array(
            z.object({
              elemId: z.string().min(1),
              frame: slideElementFrameSchema,
            })
          )
          .min(1),
      })
      .optional(),
  })
  .refine(
    (body) =>
      Boolean(
        body.patches?.length ||
          body.slideBackground ||
          body.addElement ||
          body.deleteElement ||
          body.reorderElements ||
          body.initElementFrames ||
          body.clearAll
      ),
    { message: "At least one patch operation is required" }
  );

export const slidePatchResponseSchema = z.object({
  message: z.string().min(1),
  patches: z.array(slidePatchSchema).min(1),
});

/** AI chat assistant response — may include patches only, or slide-level operations. */
export const slideChatResponseSchema = z.object({
  message: z.string().min(1),
  patches: z.array(slidePatchSchema).optional(),
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
});

export type SlidePatch = z.infer<typeof slidePatchSchema>;
export type SlidePatchBody = z.infer<typeof slidePatchBodySchema>;
export type SlidePatchResponse = z.infer<typeof slidePatchResponseSchema>;
export type SlideChatResponse = z.infer<typeof slideChatResponseSchema>;

export function slideChatResponseToPatchBody(
  response: SlideChatResponse
): SlidePatchBody | null {
  const patches = response.patches ?? [];
  const body: SlidePatchBody = {
    patches: patches.length > 0 ? patches : undefined,
    slideBackground: response.slideBackground,
    addElement: response.addElement,
    deleteElement: response.deleteElement,
  };
  const hasChange = Boolean(
    body.patches?.length ||
      body.slideBackground ||
      body.addElement ||
      body.deleteElement
  );
  return hasChange ? body : null;
}

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
  "name",
  "locked",
  "visible",
  "frame",
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
      const next = { ...el, ...update };
      if (patch.frame) {
        next.frame = clampFrame(patch.frame);
      }
      return next;
    });
    slideMap.set(patch.slideId, { ...slide, elements });
  }

  return { ...graph, slides: graph.slides.map((s) => slideMap.get(s.id) ?? s) };
}

/** Solid color overrides gradient/image so the editor color picker is visible on title slides. */
export function mergeSlideBackground(
  prev: SlideBackground | undefined,
  patch: SlideBackground
): SlideBackground {
  const next: SlideBackground = { ...(prev ?? {}), ...patch };
  if (patch.color !== undefined) {
    delete next.gradient;
    delete next.image;
  }
  return next;
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
        ? { ...slide, background: mergeSlideBackground(slide.background, background) }
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

export function applyInitElementFramesPatch(
  graph: SlideGraph,
  slideId: string,
  frames: Array<{ elemId: string; frame: SlideElementFrame }>
): SlideGraph {
  return {
    ...graph,
    slides: graph.slides.map((slide) =>
      slide.id === slideId ? applyFramesToSlide(slide, frames, { freeform: true }) : slide
    ),
  };
}

export function applySlidePatchBody(graph: SlideGraph, body: SlidePatchBody): SlideGraph {
  let next = graph;

  if (body.initElementFrames) {
    next = applyInitElementFramesPatch(
      next,
      body.initElementFrames.slideId,
      body.initElementFrames.frames
    );
  }
  if (body.patches?.length) {
    next = applySlidePatches(next, body.patches);
    if (body.patches.some((p) => p.frame)) {
      next = {
        ...next,
        slides: next.slides.map((slide) => {
          const touched = body.patches?.some(
            (p) => p.slideId === slide.id && p.frame !== undefined
          );
          return touched ? { ...slide, freeform: true } : slide;
        }),
      };
    }
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
