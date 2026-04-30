import { describe, expect, it } from "vitest";
import {
  analyzeDrop,
  cellKey,
  emptyGrid,
  executeDrop,
  isRowFull,
  removeBlock,
  reshapeGrid
} from "./grid-logic";

const presets = {
  pill: { id: "pill", title: "Пилюля", color: "#444" }
};

function placeThreeInRow0(cols: number) {
  let g = emptyGrid(cols, 2);
  const cells = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  for (const p of cells) {
    const a = analyzeDrop(g, { kind: "palette", presetId: "pill" }, p);
    expect(a.result).toBe("create");
    g = executeDrop(g, a, presets)!;
  }
  expect(isRowFull(g, 0)).toBe(true);
  return g;
}

describe("grid-logic / правило полного ряда", () => {
  it("запрещает вертикальный перенос блока из заполненного ряда", () => {
    const g = placeThreeInRow0(3);
    const blockId = g.occupancy[cellKey(0, 0)]!;
    const drop = analyzeDrop(g, { kind: "block", instanceId: blockId }, { row: 1, col: 0 });
    expect(drop.result).toBe("reject");
    if (drop.result === "reject") {
      expect(drop.reason).toBe("locked_row_vertical");
    }
  });

  it("разрешает горизонтальный перенос на пустую ячейку в незаполненном ряду", () => {
    let g = emptyGrid(4, 2);
    for (const c of [0, 1, 2]) {
      const a = analyzeDrop(g, { kind: "palette", presetId: "pill" }, { row: 0, col: c });
      expect(a.result).toBe("create");
      g = executeDrop(g, a, presets)!;
    }
    expect(isRowFull(g, 0)).toBe(false);
    const bid = g.occupancy[cellKey(0, 0)]!;
    const d = analyzeDrop(g, { kind: "block", instanceId: bid }, { row: 0, col: 3 });
    expect(d.result).toBe("move");
  });

  it("свап в полном ряду между занятыми ячейками", () => {
    const g = placeThreeInRow0(3);
    const aId = g.occupancy[cellKey(0, 0)]!;
    const swap = analyzeDrop(g, { kind: "block", instanceId: aId }, { row: 0, col: 1 });
    expect(swap.result).toBe("swap");
  });

  it("после удаления одного блока ряд не полный → вертикаль разрешена", () => {
    let g = placeThreeInRow0(3);
    const mid = g.occupancy[cellKey(0, 1)]!;
    g = removeBlock(g, mid)!;
    expect(isRowFull(g, 0)).toBe(false);
    const mover = g.occupancy[cellKey(0, 0)]!;
    const d = analyzeDrop(g, { kind: "block", instanceId: mover }, { row: 1, col: 0 });
    expect(d.result).not.toBe("reject");
  });

  it("пересборка сетки сохраняет порядок блоков", () => {
    let g = placeThreeInRow0(3);
    g = reshapeGrid(g, 2, 1);
    expect(Object.keys(g.blocks).length).toBe(3);
  });
});
