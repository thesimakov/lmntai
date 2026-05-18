import { create } from "zustand";
import type { SlideGraph, SlideElement } from "@/lib/slide-graph/types";

export interface PresentationChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type PresentationEditorStatus = "idle" | "generating" | "ready" | "error";

interface PresentationEditorStore {
  projectId: string | null;
  graph: SlideGraph | null;
  html: string | null;
  currentSlideIndex: number;
  selectedElementId: string | null;
  status: PresentationEditorStatus;
  chatMessages: PresentationChatMessage[];
  isStreaming: boolean;
  error: string | null;

  setProjectId: (id: string) => void;
  setGraph: (graph: SlideGraph, html: string) => void;
  setCurrentSlide: (index: number) => void;
  setSelectedElement: (id: string | null) => void;
  setStatus: (status: PresentationEditorStatus) => void;
  setError: (msg: string | null) => void;
  setIsStreaming: (v: boolean) => void;
  updateElement: (slideId: string, elementId: string, updates: Partial<SlideElement>) => void;
  addChatMessage: (msg: PresentationChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  reset: () => void;
}

const initialState = {
  projectId: null,
  graph: null,
  html: null,
  currentSlideIndex: 0,
  selectedElementId: null,
  status: "idle" as PresentationEditorStatus,
  chatMessages: [],
  isStreaming: false,
  error: null,
};

export const usePresentationEditorStore = create<PresentationEditorStore>((set, get) => ({
  ...initialState,

  setProjectId: (id) => set({ projectId: id }),

  setGraph: (graph, html) =>
    set({ graph, html, status: "ready", currentSlideIndex: 0, selectedElementId: null }),

  setCurrentSlide: (index) => set({ currentSlideIndex: index, selectedElementId: null }),

  setSelectedElement: (id) => set({ selectedElementId: id }),

  setStatus: (status) => set({ status }),

  setError: (msg) => set({ error: msg }),

  setIsStreaming: (v) => set({ isStreaming: v }),

  updateElement: (slideId, elementId, updates) => {
    const { graph } = get();
    if (!graph) return;
    const slides = graph.slides.map((slide) => {
      if (slide.id !== slideId) return slide;
      return {
        ...slide,
        elements: slide.elements.map((el) =>
          el.id === elementId ? { ...el, ...updates } : el
        ),
      };
    });
    set({ graph: { ...graph, slides } });
  },

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.chatMessages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant") {
          messages[i] = { ...messages[i], content };
          break;
        }
      }
      return { chatMessages: messages };
    }),

  reset: () => set(initialState),
}));
