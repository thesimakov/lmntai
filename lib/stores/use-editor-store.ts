import { create } from "zustand";

export interface SnapGuide {
  axis: "x" | "y";
  value: number;
}

interface EditorState {
  activeSlideIndex: number;
  selectedElemId: string | null;
  leftTab: "slides" | "layers";
  rightMode: "props" | "slide" | "theme" | "notes";
  zoom: number;
  isDragging: boolean;
  snapGuides: SnapGuide[];
  scale: number;

  setActiveSlideIndex: (i: number) => void;
  setSelectedElemId: (id: string | null) => void;
  setLeftTab: (tab: "slides" | "layers") => void;
  setRightMode: (mode: "props" | "slide" | "theme" | "notes") => void;
  setZoom: (z: number) => void;
  setIsDragging: (v: boolean) => void;
  setSnapGuides: (guides: SnapGuide[]) => void;
  setScale: (s: number) => void;
}

const initialState = {
  activeSlideIndex: 0,
  selectedElemId: null,
  leftTab: "slides" as const,
  rightMode: "props" as const,
  zoom: 1,
  isDragging: false,
  snapGuides: [],
  scale: 1,
};

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,

  setActiveSlideIndex: (i) =>
    set({ activeSlideIndex: i, selectedElemId: null }),

  setSelectedElemId: (id) => set({ selectedElemId: id }),

  setLeftTab: (tab) => set({ leftTab: tab }),

  setRightMode: (mode) => set({ rightMode: mode }),

  setZoom: (z) => set({ zoom: Math.max(0.25, Math.min(3, z)) }),

  setIsDragging: (v) => set({ isDragging: v }),

  setSnapGuides: (guides) => set({ snapGuides: guides }),

  setScale: (s) => set({ scale: s }),
}));
