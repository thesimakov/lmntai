import { create } from "zustand";
import type { BlockPreset, GridModel, LayerConfig, SavedTemplate } from "@/lib/template-layer-editor/types";
import {
  analyzeAndExecute,
  cellKey,
  collectValidTargetKeys,
  emptyGrid,
  reshapeGrid,
  removeBlock,
  parseCellKey
} from "@/lib/template-layer-editor/grid-logic";

export const DEFAULT_PALETTE: BlockPreset[] = [
  { id: "pill", title: "Пилюля", color: "#7c3aed", icon: "●" },
  { id: "note", title: "Заметка", color: "#0891b2", icon: "▤" },
  { id: "flag", title: "Флаг", color: "#ea580c", icon: "⚑" },
  { id: "star", title: "Якорь", color: "#16a34a", icon: "★" },
  { id: "warn", title: "Внимание", color: "#dc2626", icon: "!" }
];

const DEFAULT_LAYERS: LayerConfig[] = [
  {
    id: "layer-bg",
    name: "Фон нижний слой",
    visible: true,
    role: "background",
    behindGrid: true
  },
  {
    id: "layer-main-grid",
    name: "Сетка (основной слой блоков)",
    visible: true,
    role: "grid",
    behindGrid: false
  },
  {
    id: "layer-caption",
    name: "Метки над сеткой",
    visible: false,
    role: "annotation",
    behindGrid: false
  }
];

export function presetsMap(list: BlockPreset[]): Record<string, BlockPreset> {
  return Object.fromEntries(list.map((p) => [p.id, p]));
}

type DragSurface =
  | null
  | { kind: "block"; instanceId: string }
  | { kind: "palette"; presetId: string };

export interface LayerEditorStore {
  gridLayerId: string;
  layers: LayerConfig[];
  presets: BlockPreset[];
  presetById: Record<string, BlockPreset>;
  grid: GridModel;
  templates: SavedTemplate[];

  renameLayer: (id: string, name: string) => void;
  setLayerVisibility: (id: string, visible: boolean) => void;

  reshape: (cols: number, rowsMin: number) => void;
  incrementRows: (delta: number) => void;

  dropFromDnD: (source: DragSurface, targetCellKey: string) => "ok" | "reject";

  paletteClickAdd: (presetId: string) => boolean;
  deleteBlockById: (id: string) => void;

  saveTemplateAs: (name: string) => void;
  loadTemplate: (id: string) => void;
  deleteTemplateById: (id: string) => void;

  activeDragSurface: DragSurface;
  highlightedKeys: Set<string>;
  dragDidReject: boolean;
  setDragSurface: (d: DragSurface) => void;
  setDragRejected: (v: boolean) => void;

  seedDemoBlocks: () => void;
}

export const useLayerEditorStore = create<LayerEditorStore>((set, get) => ({
  gridLayerId: "layer-main-grid",
  layers: DEFAULT_LAYERS,
  presets: DEFAULT_PALETTE,
  presetById: presetsMap(DEFAULT_PALETTE),

  grid: emptyGrid(3, 4),
  templates: [],

  activeDragSurface: null,
  highlightedKeys: new Set(),
  dragDidReject: false,

  renameLayer: (id, name) => {
    set((s) => ({
      layers: s.layers.map((L) => (L.id === id ? { ...L, name: name.trim() || L.name } : L))
    }));
  },

  setLayerVisibility: (id, visible) => {
    set((s) => ({
      layers: s.layers.map((L) => (L.id === id ? { ...L, visible } : L))
    }));
  },

  reshape: (cols, rowsMin) => {
    set((s) => ({ grid: reshapeGrid(s.grid, cols, rowsMin) }));
  },

  incrementRows: (delta) => {
    const s = get();
    const nr = Math.max(1, s.grid.rows + delta);
    set({ grid: reshapeGrid(s.grid, s.grid.columns, nr) });
  },

  dropFromDnD: (source, targetCellKey) => {
    if (!source) return "reject";
    const parsed = parseCellKey(targetCellKey);
    if (!parsed) return "reject";

    const s = get();
    const presets = s.presetById;

    const srcDescr =
      source.kind === "block"
        ? { kind: "block" as const, instanceId: source.instanceId }
        : { kind: "palette" as const, presetId: source.presetId };

    const { next, analysis } = analyzeAndExecute(s.grid, srcDescr, parsed, presets);

    if (analysis.result === "noop") {
      set({ dragDidReject: false });
      return "ok";
    }

    if (!next || analysis.result === "reject") {
      return "reject";
    }
    set({ grid: next, dragDidReject: false });
    return "ok";
  },

  paletteClickAdd: (presetId) => {
    const s = get();
    const preset = s.presetById[presetId];
    if (!preset) return false;
    for (let r = 0; r < s.grid.rows; r++) {
      for (let c = 0; c < s.grid.columns; c++) {
        if (s.grid.occupancy[cellKey(r, c)]) continue;
        const { next } = analyzeAndExecute(
          s.grid,
          { kind: "palette", presetId },
          { row: r, col: c },
          s.presetById
        );
        if (next) {
          set({ grid: next });
          return true;
        }
      }
    }
    return false;
  },

  deleteBlockById: (id) => {
    const nb = removeBlock(get().grid, id);
    if (nb) set({ grid: nb });
  },

  saveTemplateAs: (name) => {
    const s = get();
    const snap: SavedTemplate = {
      id: crypto.randomUUID(),
      name: name.trim() || "Шаблон",
      createdAt: Date.now(),
      snapshot: { grid: structuredClone(s.grid), layers: structuredClone(s.layers) }
    };
    set((st) => {
      const templates = [...st.templates, snap];
      try {
        localStorage.setItem("lmnt-template-layer-editor-templates", JSON.stringify(templates));
      } catch {
        /* ignore */
      }
      return { templates };
    });
  },

  loadTemplate: (tid) => {
    const tpl = get().templates.find((t) => t.id === tid);
    if (!tpl) return;
    set({
      grid: structuredClone(tpl.snapshot.grid),
      layers: structuredClone(tpl.snapshot.layers)
    });
  },

  deleteTemplateById: (tid) =>
    set((st) => {
      const templates = st.templates.filter((t) => t.id !== tid);
      try {
        localStorage.setItem("lmnt-template-layer-editor-templates", JSON.stringify(templates));
      } catch {
        /* ignore */
      }
      return { templates };
    }),

  setDragSurface: (d) =>
    set((st) => {
      if (!d) {
        return { activeDragSurface: null, highlightedKeys: new Set() };
      }
      const srcDescr =
        d.kind === "block"
          ? { kind: "block" as const, instanceId: d.instanceId }
          : { kind: "palette" as const, presetId: d.presetId };
      return {
        activeDragSurface: d,
        highlightedKeys: collectValidTargetKeys(st.grid, srcDescr),
        dragDidReject: false
      };
    }),

  setDragRejected: (v) => set({ dragDidReject: v }),

  seedDemoBlocks: () => {
    const presets = get().presetById;
    const at = [
      [0, 0, "pill"],
      [0, 1, "note"],
      [1, 1, "flag"]
    ] as const;
    let cur = structuredClone(get().grid);
    for (const [r, c, pid] of at) {
      const { next } = analyzeAndExecute(
        cur,
        { kind: "palette", presetId: pid },
        { row: r, col: c },
        presets
      );
      if (next) cur = next;
    }
    set({ grid: cur });
  }
}));

export function hydrateTemplatesFromStorage() {
  try {
    const raw = localStorage.getItem("lmnt-template-layer-editor-templates");
    if (!raw) return;
    const parsed = JSON.parse(raw) as SavedTemplate[];
    if (!Array.isArray(parsed)) return;
    useLayerEditorStore.setState({ templates: parsed });
  } catch {
    /* ignore */
  }
}
