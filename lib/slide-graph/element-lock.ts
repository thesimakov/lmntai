import type { Slide, SlideElement } from "./types";

/** Only explicitly locked elements (`locked: true`) are non-interactive on the canvas. */
export function isSlideElementLocked(el: SlideElement): boolean {
  return el.locked === true;
}

/** Undo legacy default where every element was saved with `locked: true`. */
export function clearMassLockedSlideElements(slide: Slide): Slide {
  if (slide.elements.length === 0) return slide;
  if (!slide.elements.every((el) => el.locked === true)) return slide;
  return {
    ...slide,
    elements: slide.elements.map((el) => ({ ...el, locked: false })),
  };
}
