import { create } from "zustand";
import type {
  SlideGraph,
  SlideElement,
  SlideElementFrame,
  SlideBackground,
} from "@/lib/slide-graph/types";
import {
  applySlidePatches,
  applySlideBackgroundPatch,
  applyAddElementPatch,
  applyDeleteElementPatch,
  applyReorderElementsPatch,
  applyInitElementFramesPatch,
} from "@/lib/slide-graph/patch";
import { clearMassLockedSlideElements } from "@/lib/slide-graph/element-lock";
import {
  clampFrame,
  defaultElementFrame,
  slideNeedsFrameCapture,
} from "@/lib/slide-graph/freeform";

let saveTimer: ReturnType<typeof setTimeout> | null = null;

interface SlideStoreState {
  graph: SlideGraph;
  projectId: string;

  init: (projectId: string, graph: SlideGraph) => void;
  setGraph: (graph: SlideGraph) => void;
  updateElement: (slideId: string, elemId: string, patch: Partial<SlideElement>) => void;
  moveElement: (slideId: string, elemId: string, x: number, y: number) => void;
  resizeElement: (slideId: string, elemId: string, frame: SlideElementFrame) => void;
  updateBackground: (slideId: string, bg: SlideBackground) => void;
  addElement: (slideId: string, element: SlideElement) => void;
  deleteElement: (slideId: string, elemId: string) => void;
  reorderElements: (slideId: string, elemIds: string[]) => void;
  ensureFrames: (slideId: string) => void;
}

async function savePatch(projectId: string, body: unknown): Promise<void> {
  await fetch(`/api/projects/${projectId}/slides/patch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function scheduleSave(projectId: string, body: unknown): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void savePatch(projectId, body), 800);
}

const EMPTY_GRAPH: SlideGraph = {
  version: 1,
  meta: {
    title: "",
    language: "ru",
    theme: {
      primaryColor: "#3b82f6",
      backgroundColor: "#ffffff",
      textColor: "#1a1a2e",
      fontFamily: "Inter",
    },
    generatedAt: "",
  },
  slides: [],
};

export const useSlideStore = create<SlideStoreState>((set, get) => ({
  graph: EMPTY_GRAPH,
  projectId: "",

  init: (projectId, graph) =>
    set({
      projectId,
      graph: {
        ...graph,
        slides: graph.slides.map(clearMassLockedSlideElements),
      },
    }),

  setGraph: (graph) =>
    set({
      graph: {
        ...graph,
        slides: graph.slides.map(clearMassLockedSlideElements),
      },
    }),

  updateElement: (slideId, elemId, patch) => {
    const { graph, projectId } = get();
    const next = applySlidePatches(graph, [{ slideId, elemId, ...patch }]);
    set({ graph: next });
    scheduleSave(projectId, { patches: [{ slideId, elemId, ...patch }] });
  },

  moveElement: (slideId, elemId, x, y) => {
    const { graph, projectId } = get();
    const slide = graph.slides.find((s) => s.id === slideId);
    const el = slide?.elements.find((e) => e.id === elemId);
    if (!el) return;
    const frame = clampFrame({
      ...(el.frame ?? defaultElementFrame(0, el.type)),
      x,
      y,
    });
    const next = applySlidePatches(graph, [{ slideId, elemId, frame }]);
    set({
      graph: {
        ...next,
        slides: next.slides.map((s) =>
          s.id === slideId ? { ...s, freeform: true } : s
        ),
      },
    });
    scheduleSave(projectId, { patches: [{ slideId, elemId, frame }] });
  },

  resizeElement: (slideId, elemId, frame) => {
    const { graph, projectId } = get();
    const clamped = clampFrame(frame);
    const next = applySlidePatches(graph, [{ slideId, elemId, frame: clamped }]);
    set({
      graph: {
        ...next,
        slides: next.slides.map((s) =>
          s.id === slideId ? { ...s, freeform: true } : s
        ),
      },
    });
    scheduleSave(projectId, { patches: [{ slideId, elemId, frame: clamped }] });
  },

  updateBackground: (slideId, bg) => {
    const { graph, projectId } = get();
    const next = applySlideBackgroundPatch(graph, slideId, bg);
    set({ graph: next });
    scheduleSave(projectId, { slideBackground: { slideId, background: bg } });
  },

  addElement: (slideId, element) => {
    const { graph, projectId } = get();
    const next = applyAddElementPatch(graph, slideId, element);
    set({ graph: next });
    scheduleSave(projectId, { addElement: { slideId, element } });
  },

  deleteElement: (slideId, elemId) => {
    const { graph, projectId } = get();
    const next = applyDeleteElementPatch(graph, slideId, elemId);
    set({ graph: next });
    scheduleSave(projectId, { deleteElement: { slideId, elemId } });
  },

  reorderElements: (slideId, elemIds) => {
    const { graph, projectId } = get();
    const next = applyReorderElementsPatch(graph, slideId, elemIds);
    set({ graph: next });
    scheduleSave(projectId, { reorderElements: { slideId, elemIds } });
  },

  ensureFrames: (slideId) => {
    const { graph } = get();
    const slide = graph.slides.find((s) => s.id === slideId);
    if (!slide) return;
    // Already in freeform with frames — avoid set() (prevents React update loops).
    if (!slideNeedsFrameCapture(slide) && slide.freeform) return;

    const frames = slide.elements.map((el, i) => ({
      elemId: el.id,
      frame: el.frame ?? defaultElementFrame(i, el.type),
    }));
    const next = applyInitElementFramesPatch(graph, slideId, frames);
    set({ graph: next });
    // No server call — frames are initialised client-side only until next element edit
  },
}));
