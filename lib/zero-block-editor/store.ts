import { create } from "zustand";
import type { ZbElement, ZbBreakpoint, ZbCanvasConfig, ZbSnapGuide, ZbResponsiveOverride } from "./types";
import { ZB_DEFAULT_CANVAS } from "./defaults";

const MAX_HISTORY = 50;

export interface ZbEditorStore {
  elements: ZbElement[];
  selectedIds: string[];
  breakpoint: ZbBreakpoint;
  canvas: ZbCanvasConfig;
  snapGuides: ZbSnapGuide[];
  layersPanelOpen: boolean;
  settingsPanelOpen: boolean;
  isDragging: boolean;
  isResizing: boolean;
  history: ZbElement[][];
  future: ZbElement[][];
  clipboard: ZbElement[];

  // Element mutations
  setElements: (elements: ZbElement[]) => void;
  addElement: (el: ZbElement) => void;
  updateElement: (id: string, patch: Partial<ZbElement>) => void;
  updateElementProps: (id: string, propsPatch: Record<string, unknown>) => void;
  removeElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;
  reorderElements: (ids: string[], targetIndex: number) => void;

  // Selection
  selectIds: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;

  // Canvas & breakpoint
  setBreakpoint: (bp: ZbBreakpoint) => void;
  updateCanvas: (patch: Partial<ZbCanvasConfig>) => void;

  // Responsive overrides
  updateElementResponsive: (id: string, bp: ZbBreakpoint, patch: ZbResponsiveOverride) => void;

  // Interaction state
  setSnapGuides: (guides: ZbSnapGuide[]) => void;
  setLayersPanelOpen: (open: boolean) => void;
  setSettingsPanelOpen: (open: boolean) => void;
  setIsDragging: (v: boolean) => void;
  setIsResizing: (v: boolean) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Z-order
  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;

  // Alignment
  alignElements: (ids: string[], alignment: "left" | "centerH" | "right" | "top" | "centerV" | "bottom") => void;

  // Batch update
  updateElements: (updates: Array<{ id: string; patch: Partial<ZbElement> }>) => void;

  // Clipboard
  copyElements: (ids: string[]) => void;
  pasteElements: () => void;

  // Misc
  lockElements: (ids: string[], locked: boolean) => void;
  toggleVisibility: (ids: string[]) => void;
  renameElement: (id: string, name: string) => void;
}

export const useZbEditorStore = create<ZbEditorStore>((set, get) => ({
  elements: [],
  selectedIds: [],
  breakpoint: "desktop",
  canvas: ZB_DEFAULT_CANVAS,
  snapGuides: [],
  layersPanelOpen: false,
  settingsPanelOpen: false,
  isDragging: false,
  isResizing: false,
  history: [],
  future: [],
  clipboard: [],

  setElements: (elements) => set({ elements }),

  addElement: (el) => {
    get().pushHistory();
    const maxZ = get().elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    set((s) => ({ elements: [...s.elements, { ...el, zIndex: maxZ + 1 }], selectedIds: [el.id] }));
  },

  updateElement: (id, patch) => {
    set((s) => ({
      elements: s.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    }));
  },

  updateElementProps: (id, propsPatch) => {
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id ? { ...el, props: { ...el.props, ...propsPatch } } : el,
      ),
    }));
  },

  removeElements: (ids) => {
    get().pushHistory();
    set((s) => ({
      elements: s.elements.filter((el) => !ids.includes(el.id)),
      selectedIds: s.selectedIds.filter((id) => !ids.includes(id)),
    }));
  },

  duplicateElements: (ids) => {
    get().pushHistory();
    const { elements } = get();
    const toDupe = elements.filter((el) => ids.includes(el.id));
    const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const duped = toDupe.map((el, i) => ({
      ...el,
      id: `zb_${Date.now().toString(36)}_${i}`,
      x: el.x + 16,
      y: el.y + 16,
      zIndex: maxZ + i + 1,
    }));
    set((s) => ({ elements: [...s.elements, ...duped], selectedIds: duped.map((e) => e.id) }));
  },

  reorderElements: (ids, targetIndex) => {
    const { elements } = get();
    const moving = elements.filter((e) => ids.includes(e.id));
    const rest = elements.filter((e) => !ids.includes(e.id));
    const idx = Math.min(Math.max(targetIndex, 0), rest.length);
    rest.splice(idx, 0, ...moving);
    set({ elements: rest });
  },

  selectIds: (ids) => set({ selectedIds: ids, ...(ids.length > 0 ? { settingsPanelOpen: true } : {}) }),

  toggleSelection: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((i) => i !== id)
        : [...s.selectedIds, id],
    })),

  clearSelection: () => set({ selectedIds: [], settingsPanelOpen: false }),

  setBreakpoint: (bp) => set({ breakpoint: bp }),
  updateCanvas: (patch) => set((s) => ({ canvas: { ...s.canvas, ...patch } })),

  updateElementResponsive: (id, bp, patch) =>
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id
          ? { ...el, responsive: { ...el.responsive, [bp]: { ...(el.responsive[bp] ?? {}), ...patch } } }
          : el,
      ),
    })),

  setSnapGuides: (guides) => set({ snapGuides: guides }),
  setLayersPanelOpen: (open) => set({ layersPanelOpen: open }),
  setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),
  setIsDragging: (v) => set({ isDragging: v }),
  setIsResizing: (v) => set({ isResizing: v }),

  pushHistory: () => {
    const { elements, history } = get();
    set({ history: [...history, elements].slice(-MAX_HISTORY), future: [] });
  },

  undo: () => {
    const { history, elements, future } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      elements: prev,
      history: history.slice(0, -1),
      future: [elements, ...future].slice(0, MAX_HISTORY),
      selectedIds: [],
    });
  },

  redo: () => {
    const { history, elements, future } = get();
    if (future.length === 0) return;
    set({
      elements: future[0],
      history: [...history, elements],
      future: future.slice(1),
      selectedIds: [],
    });
  },

  bringToFront: (ids) => {
    const { elements } = get();
    const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    set((s) => ({
      elements: s.elements.map((el, i) =>
        ids.includes(el.id) ? { ...el, zIndex: maxZ + i + 1 } : el,
      ),
    }));
  },

  sendToBack: (ids) => {
    const { elements } = get();
    const minZ = elements.reduce((m, e) => Math.min(m, e.zIndex), 0);
    set((s) => ({
      elements: s.elements.map((el, i) =>
        ids.includes(el.id) ? { ...el, zIndex: minZ - ids.length + i } : el,
      ),
    }));
  },

  bringForward: (ids) => {
    set((s) => ({
      elements: s.elements.map((el) =>
        ids.includes(el.id) ? { ...el, zIndex: el.zIndex + 1 } : el,
      ),
    }));
  },

  sendBackward: (ids) => {
    set((s) => ({
      elements: s.elements.map((el) =>
        ids.includes(el.id) ? { ...el, zIndex: Math.max(0, el.zIndex - 1) } : el,
      ),
    }));
  },

  alignElements: (ids, alignment) => {
    const { elements } = get();
    const targets = elements.filter((el) => ids.includes(el.id));
    if (targets.length < 2) return;
    get().pushHistory();
    const minX = Math.min(...targets.map((el) => el.x));
    const maxR = Math.max(...targets.map((el) => el.x + el.w));
    const minY = Math.min(...targets.map((el) => el.y));
    const maxB = Math.max(...targets.map((el) => el.y + el.h));
    set((s) => ({
      elements: s.elements.map((el) => {
        if (!ids.includes(el.id)) return el;
        switch (alignment) {
          case "left": return { ...el, x: minX };
          case "right": return { ...el, x: maxR - el.w };
          case "centerH": return { ...el, x: Math.round((minX + maxR) / 2 - el.w / 2) };
          case "top": return { ...el, y: minY };
          case "bottom": return { ...el, y: maxB - el.h };
          case "centerV": return { ...el, y: Math.round((minY + maxB) / 2 - el.h / 2) };
          default: return el;
        }
      }),
    }));
  },

  updateElements: (updates) => {
    set((s) => ({
      elements: s.elements.map((el) => {
        const u = updates.find((u) => u.id === el.id);
        return u ? { ...el, ...u.patch } : el;
      }),
    }));
  },

  copyElements: (ids) => {
    const { elements } = get();
    const toCopy = elements.filter((el) => ids.includes(el.id));
    set({ clipboard: toCopy });
  },

  pasteElements: () => {
    const { clipboard, elements } = get();
    if (clipboard.length === 0) return;
    get().pushHistory();
    const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const pasted = clipboard.map((el, i) => ({
      ...el,
      id: `zb_${Date.now().toString(36)}_${i}`,
      x: el.x + 16,
      y: el.y + 16,
      zIndex: maxZ + i + 1,
    }));
    set((s) => ({ elements: [...s.elements, ...pasted], selectedIds: pasted.map((e) => e.id) }));
  },

  lockElements: (ids, locked) => {
    set((s) => ({
      elements: s.elements.map((el) => (ids.includes(el.id) ? { ...el, locked } : el)),
    }));
  },

  toggleVisibility: (ids) => {
    set((s) => ({
      elements: s.elements.map((el) =>
        ids.includes(el.id) ? { ...el, visible: !el.visible } : el,
      ),
    }));
  },

  renameElement: (id, name) => {
    set((s) => ({
      elements: s.elements.map((el) => (el.id === id ? { ...el, name } : el)),
    }));
  },
}));
