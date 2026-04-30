/** Модель блока в сетке (экземпляр из палитры). */
export interface BlockInstance {
  id: string;
  presetId: string;
  title: string;
  color: string;
  icon?: string;
}

/** Пресет палитры — фабрика новых экземпляров. */
export interface BlockPreset {
  id: string;
  title: string;
  color: string;
  icon?: string;
}

export interface Position {
  row: number;
  col: number;
}

export type GridLayerRole = "grid" | "annotation" | "background";

/** Декоративные / вспомогательные слои (не участвуют в DnD). */
export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  role: GridLayerRole;
  /** Ниже («позади») сетки или выше */
  behindGrid: boolean;
}

export interface GridModel {
  columns: number;
  rows: number;
  /** Ключ ячейки `row-col` → id экземпляра */
  occupancy: Record<string, string | undefined>;
  blocks: Record<string, BlockInstance>;
}

export type DragSourceDescriptor =
  | { kind: "block"; instanceId: string }
  | { kind: "palette"; presetId: string };

export type DropAnalysis =
  | { result: "reject"; reason: string }
  | { result: "noop" }
  | { result: "move"; from: Position; to: Position; blockId: string }
  | { result: "swap"; a: Position; b: Position; blockIdA: string; blockIdB: string }
  | { result: "create"; presetId: string; at: Position };

export interface SavedTemplate {
  id: string;
  name: string;
  createdAt: number;
  snapshot: {
    grid: GridModel;
    layers: LayerConfig[];
  };
}
