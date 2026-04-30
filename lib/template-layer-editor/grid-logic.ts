/**
 * Чистая логика сетки: «три блока в ряд», свап только в полном ряду,
 * вертикальный перенос блока из полного ряда запрещён.
 */
import type {
  BlockInstance,
  BlockPreset,
  DropAnalysis,
  GridModel,
  Position,
  DragSourceDescriptor
} from "./types";

export function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

export function parseCellKey(key: string): Position | null {
  const m = key.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  return { row: Number(m[1]), col: Number(m[2]) };
}

export function inBounds(p: Position, columns: number, rows: number): boolean {
  return p.row >= 0 && p.row < rows && p.col >= 0 && p.col < columns;
}

/** Ряд «заполнен полностью» — ровно по одному блоку в каждой колонке этого ряда. */
export function isRowFull(grid: GridModel, row: number): boolean {
  for (let c = 0; c < grid.columns; c++) {
    if (!grid.occupancy[cellKey(row, c)]) return false;
  }
  return true;
}

export function countBlocksInRow(grid: GridModel, row: number): number {
  let n = 0;
  for (let c = 0; c < grid.columns; c++) {
    if (grid.occupancy[cellKey(row, c)]) n++;
  }
  return n;
}

export function findPositionOfBlock(grid: GridModel, blockId: string): Position | undefined {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.columns; c++) {
      if (grid.occupancy[cellKey(r, c)] === blockId) return { row: r, col: c };
    }
  }
  return undefined;
}

function cloneGrid(grid: GridModel): GridModel {
  return {
    columns: grid.columns,
    rows: grid.rows,
    occupancy: { ...grid.occupancy },
    blocks: { ...grid.blocks }
  };
}

/**
 * Анализ одного drop без мутаций.
 * Правила из ТЗ:
 * - Пустая цель: перенос со свободного ряда куда угодно; из полного ряда — только в тот же ряд.
 * - Цель занята: свап возможен только если исход и цель в одном И ТОМ ЖЕ полном ряду.
 * - Иначе отклонение.
 */
export function analyzeDrop(grid: GridModel, source: DragSourceDescriptor, target: Position): DropAnalysis {
  if (!inBounds(target, grid.columns, grid.rows)) {
    return { result: "reject", reason: "out_of_bounds" };
  }

  const tk = cellKey(target.row, target.col);
  const targetBlockId = grid.occupancy[tk];

  if (source.kind === "palette") {
    if (targetBlockId) return { result: "reject", reason: "palette_on_occupied" };
    return { result: "create", presetId: source.presetId, at: target };
  }

  const blockId = source.instanceId;
  const from = findPositionOfBlock(grid, blockId);
  if (!from) return { result: "reject", reason: "block_not_found" };
  if (from.row === target.row && from.col === target.col) return { result: "noop" };

  const fromRowFull = isRowFull(grid, from.row);

  if (!targetBlockId) {
    if (fromRowFull && target.row !== from.row) {
      return { result: "reject", reason: "locked_row_vertical" };
    }
    return { result: "move", from, to: target, blockId };
  }

  // занятая ячейка
  if (from.row !== target.row) {
    return { result: "reject", reason: "swap_cross_row" };
  }
  const rowFull = isRowFull(grid, from.row);
  if (!rowFull) {
    return { result: "reject", reason: "swap_only_full_row" };
  }
  return {
    result: "swap",
    a: from,
    b: target,
    blockIdA: blockId,
    blockIdB: targetBlockId
  };
}

/** Применяет результат анализа; для палитры нужна карта пресетов для title/color/icon. */
export function executeDrop(
  grid: GridModel,
  analysis: DropAnalysis,
  presetsById: Partial<Record<string, BlockPreset>>
): GridModel | null {
  if (analysis.result === "reject" || analysis.result === "noop") return null;
  const next = cloneGrid(grid);
  switch (analysis.result) {
    case "move": {
      const fk = cellKey(analysis.from.row, analysis.from.col);
      const tk = cellKey(analysis.to.row, analysis.to.col);
      delete next.occupancy[fk];
      next.occupancy[tk] = analysis.blockId;
      return next;
    }
    case "swap": {
      const ka = cellKey(analysis.a.row, analysis.a.col);
      const kb = cellKey(analysis.b.row, analysis.b.col);
      next.occupancy[ka] = analysis.blockIdB;
      next.occupancy[kb] = analysis.blockIdA;
      return next;
    }
    case "create": {
      const p = presetsById[analysis.presetId];
      if (!p) return null;
      const inst = createBlockFromPreset(p);
      next.occupancy[cellKey(analysis.at.row, analysis.at.col)] = inst.id;
      next.blocks[inst.id] = inst;
      return next;
    }
    default:
      return null;
  }
}

export function analyzeAndExecute(
  grid: GridModel,
  source: DragSourceDescriptor,
  target: Position,
  presetsById: Partial<Record<string, BlockPreset>>
): { next: GridModel | null; analysis: DropAnalysis } {
  const analysis = analyzeDrop(grid, source, target);
  if (analysis.result === "reject" || analysis.result === "noop") {
    return { next: null, analysis };
  }
  const next = executeDrop(grid, analysis, presetsById);
  return { next, analysis };
}

/** Для подсветки Droppable: какие ячейки теоретически принимают drop. */
export function collectValidTargetKeys(
  grid: GridModel,
  source: DragSourceDescriptor
): Set<string> {
  const out = new Set<string>();
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.columns; c++) {
      const pos = { row: r, col: c };
      const d = analyzeDrop(grid, source, pos);
      if (d.result !== "reject" && d.result !== "noop") {
        out.add(cellKey(r, c));
      }
    }
  }
  return out;
}

/** Палитра — только пустые ячейки и ряд не может быть уже полностью занят (нет пустых мест). */
export function canPaletteAddToCell(grid: GridModel, presetId: string, at: Position): boolean {
  void presetId;
  if (!inBounds(at, grid.columns, grid.rows)) return false;
  if (grid.occupancy[cellKey(at.row, at.col)]) return false;
  for (let c = 0; c < grid.columns; c++) {
    if (!grid.occupancy[cellKey(at.row, c)]) return true;
  }
  return false;
}

export function emptyGrid(columns: number, rows: number): GridModel {
  return {
    columns,
    rows,
    occupancy: {},
    blocks: {}
  };
}

/** Есть ли хотя бы одна пустая ячейка целиком по сетке. */
export function hasEmptyCell(grid: GridModel): boolean {
  const capacity = grid.rows * grid.columns;
  const placed = Object.keys(grid.blocks).length;
  return placed < capacity;
}

export function createBlockFromPreset(preset: {
  id: string;
  title: string;
  color: string;
  icon?: string;
}): BlockInstance {
  return {
    id: crypto.randomUUID(),
    presetId: preset.id,
    title: preset.title,
    color: preset.color,
    icon: preset.icon
  };
}

/** Удаление блока из сетки — снимает ограничение с полного ряда при разрежении. */
export function removeBlock(grid: GridModel, instanceId: string): GridModel | null {
  const pos = findPositionOfBlock(grid, instanceId);
  if (!pos) return null;
  const next = cloneGrid(grid);
  delete next.occupancy[cellKey(pos.row, pos.col)];
  delete next.blocks[instanceId];
  return next;
}

/**
 * Изменение размера сетки: разбор в порядке (row, col), упаковка заново слева направо, сверху вниз.
 * Строки дополняются, пока все блоки не размещены.
 */
export function reshapeGrid(grid: GridModel, newColumns: number, newRowsMin: number): GridModel {
  const entries: { block: BlockInstance; pos: Position }[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.columns; c++) {
      const id = grid.occupancy[cellKey(r, c)];
      if (id && grid.blocks[id]) {
        entries.push({ block: { ...grid.blocks[id] }, pos: { row: r, col: c } });
      }
    }
  }
  entries.sort((a, b) => {
    if (a.pos.row !== b.pos.row) return a.pos.row - b.pos.row;
    return a.pos.col - b.pos.col;
  });
  const blocks = entries.map((e) => e.block);
  let rows = Math.max(1, newRowsMin, Math.ceil(blocks.length / Math.max(1, newColumns)));
  let occ: Record<string, string | undefined> = {};
  const blocksOut: Record<string, BlockInstance> = {};
  let i = 0;
  for (let r = 0; r < rows && i < blocks.length; r++) {
    for (let c = 0; c < newColumns && i < blocks.length; c++) {
      const b = blocks[i];
      occ[cellKey(r, c)] = b.id;
      blocksOut[b.id] = { ...b };
      i++;
    }
  }
  while (i < blocks.length) {
    rows++;
    for (let c = 0; c < newColumns && i < blocks.length; c++) {
      const b = blocks[i];
      occ[cellKey(rows - 1, c)] = b.id;
      blocksOut[b.id] = { ...b };
      i++;
    }
  }
  return {
    columns: newColumns,
    rows,
    occupancy: occ,
    blocks: blocksOut
  };
}
