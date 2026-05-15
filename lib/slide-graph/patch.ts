import { z } from "zod";
import type { SlideGraph, SlideElement } from "./types";

export const slidePatchSchema = z.object({
  slideId: z.string().min(1),
  elemId: z.string().min(1),
  content: z.string().optional(),
  items: z.array(z.string()).optional(),
  src: z.string().optional(),
  alt: z.string().optional(),
  style: z
    .object({
      color: z.string().optional(),
      fontSize: z.string().optional(),
      fontWeight: z.enum(["normal", "bold"]).optional(),
      textAlign: z.enum(["left", "center", "right"]).optional(),
      italic: z.boolean().optional(),
      opacity: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export const slidePatchResponseSchema = z.object({
  message: z.string().min(1),
  patches: z.array(slidePatchSchema).min(1),
});

export type SlidePatch = z.infer<typeof slidePatchSchema>;
export type SlidePatchResponse = z.infer<typeof slidePatchResponseSchema>;

export function applySlidePatches(graph: SlideGraph, patches: SlidePatch[]): SlideGraph {
  const slideMap = new Map(graph.slides.map((s) => [s.id, s]));

  for (const patch of patches) {
    const slide = slideMap.get(patch.slideId);
    if (!slide) continue;
    const elements = slide.elements.map((el): SlideElement => {
      if (el.id !== patch.elemId) return el;
      return {
        ...el,
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(patch.items !== undefined ? { items: patch.items } : {}),
        ...(patch.src !== undefined ? { src: patch.src } : {}),
        ...(patch.alt !== undefined ? { alt: patch.alt } : {}),
        ...(patch.style !== undefined ? { style: { ...el.style, ...patch.style } } : {}),
      };
    });
    slideMap.set(patch.slideId, { ...slide, elements });
  }

  return { ...graph, slides: graph.slides.map((s) => slideMap.get(s.id) ?? s) };
}
