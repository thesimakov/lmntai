import type { Component, Editor } from "grapesjs";

import { scheduleLemnityCanvasLayoutRefresh } from "@/components/playground/lemnity-box/lemnity-box-section-width-grid";

const MOVE_LEFT_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>';
const MOVE_DOWN_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
const MOVE_RIGHT_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>';

const ID_LEFT = "lemnity-move-sibling-left";
const ID_DOWN = "lemnity-move-sibling-down";
const ID_RIGHT = "lemnity-move-sibling-right";

type ToolbarRow = {
  id?: string;
  label?: unknown;
  command?: unknown;
  attributes?: Record<string, string>;
};

/** Поднимаем до блока страницы только для секций Lemnity (`lemnity-section`), иначе тулбар двигает выбранный узел среди его соседей. */
function resolveToolbarReorderTarget(editor: Editor, selected: Component): Component {
  const wrap = editor.getWrapper();
  if (!wrap) return selected;
  let cur: Component | null | undefined = selected;
  while (cur) {
    const p = cur.parent();
    if (p === wrap) {
      const cls = cur.getClasses?.();
      const list: string[] = Array.isArray(cls)
        ? cls.map(String)
        : typeof cls === "string"
          ? cls.split(/\s+/).filter(Boolean)
          : [];
      if (list.includes("lemnity-section")) return cur;
      return selected;
    }
    cur = p ?? undefined;
  }
  return selected;
}

function moveSelectedAmongSiblings(editor: Editor, direction: "prev" | "next"): void {
  const selected = editor.getSelected();
  if (!selected) return;
  const target = resolveToolbarReorderTarget(editor, selected);
  if (target !== selected) editor.select(target);

  const parent = target.parent();
  if (!parent) return;
  const idx = target.index();
  const siblings = parent.components();
  if (direction === "prev") {
    if (idx <= 0) return;
    target.move(parent, { at: idx - 1 });
    scheduleLemnityCanvasLayoutRefresh(editor);
    return;
  }
  const hasNext = typeof siblings.at === "function" ? siblings.at(idx + 1) : null;
  if (!hasNext) return;
  target.move(parent, { at: idx + 2 });
  scheduleLemnityCanvasLayoutRefresh(editor);
}

/**
 * Кнопки ← ↓ → сразу после «вверх к родителю»: перестановка среди соседей (один уровень вложенности).
 * В вертикальной вёрстке «вниз» / «вправо» сдвигают блок дальше по DOM; «влево» — ближе к началу родителя.
 */
export function registerLemnityBoxToolbarSiblingMoves(editor: Editor): void {
  editor.Commands.add(ID_LEFT, {
    run(ed: Editor) {
      moveSelectedAmongSiblings(ed, "prev");
    },
  });
  editor.Commands.add(ID_DOWN, {
    run(ed: Editor) {
      moveSelectedAmongSiblings(ed, "next");
    },
  });
  editor.Commands.add(ID_RIGHT, {
    run(ed: Editor) {
      moveSelectedAmongSiblings(ed, "next");
    },
  });

  const dc = editor.DomComponents;
  const type = dc.getType("default");
  const Model = type?.model as { prototype: { initToolbar: () => void } } | undefined;
  if (!Model?.prototype?.initToolbar) return;

  const proto = Model.prototype;
  const original = proto.initToolbar;

  proto.initToolbar = function patchedInitToolbar(this: {
    get: (k: string) => unknown;
    set: (k: string, v: unknown) => void;
  }) {
    original.call(this);
    const raw = this.get("toolbar");
    if (!Array.isArray(raw)) return;

    let tb = raw.slice() as ToolbarRow[];
    if (tb.some((b) => b.id === ID_LEFT)) {
      this.set("toolbar", tb);
      return;
    }

    tb = tb.filter((b) => b.id !== ID_LEFT && b.id !== ID_DOWN && b.id !== ID_RIGHT);

    const exitIdx = tb.findIndex((b) => typeof b.command === "function");
    const insertAt = exitIdx >= 0 ? exitIdx + 1 : 0;

    const extra: ToolbarRow[] = [
      {
        id: ID_LEFT,
        label: MOVE_LEFT_SVG,
        command: ID_LEFT,
        attributes: { title: "Влево: на одну позицию к началу среди соседей" },
      },
      {
        id: ID_DOWN,
        label: MOVE_DOWN_SVG,
        command: ID_DOWN,
        attributes: { title: "Вниз: на одну позицию к концу среди соседей" },
      },
      {
        id: ID_RIGHT,
        label: MOVE_RIGHT_SVG,
        command: ID_RIGHT,
        attributes: { title: "Вправо: на одну позицию к концу среди соседей" },
      },
    ];

    tb.splice(insertAt, 0, ...extra);
    this.set("toolbar", tb);
  };
}
