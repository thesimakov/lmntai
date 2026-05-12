import type { Editor } from "grapesjs";

const SAVE_BLOCK_CMD = "lemnity-save-block";
const SAVE_BLOCK_ID = "lemnity-save-block-btn";

const SAVE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><path fill="currentColor" d="M20 6H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1zm-9 9H7v-4h4v4zm6 0h-4v-4h4v4zM4 4h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z"/></svg>';

type ToolbarRow = {
  id?: string;
  label?: unknown;
  command?: unknown;
  attributes?: Record<string, string>;
};

/**
 * Registers "Save block to library" toolbar button on GrapesJS components.
 * Monkey-patches Model.prototype.initToolbar — same pattern as lemnity-box-toolbar-sibling-moves.ts.
 */
export function registerLemnityBoxToolbarSaveBlock(
  editor: Editor,
  onSaveBlock: (htmlContent: string, cssContent: string) => void,
): void {
  editor.Commands.add(SAVE_BLOCK_CMD, {
    run(ed: Editor) {
      const selected = ed.getSelected();
      if (!selected) return;
      const html = selected.toHTML?.() ?? "";
      const allCss = ed.getCss({ keepUnusedStyles: false }) ?? "";
      onSaveBlock(html, allCss);
    },
  });

  const dc = editor.DomComponents;
  const type = dc.getType("default");
  const Model = type?.model as { prototype: { initToolbar: () => void } } | undefined;
  if (!Model?.prototype?.initToolbar) return;

  const proto = Model.prototype;
  const original = proto.initToolbar;

  proto.initToolbar = function patchedSaveBlockToolbar(this: {
    get: (k: string) => unknown;
    set: (k: string, v: unknown) => void;
  }) {
    original.call(this);
    const raw = this.get("toolbar");
    if (!Array.isArray(raw)) return;

    const tb = raw.slice() as ToolbarRow[];
    if (tb.some((b) => b.id === SAVE_BLOCK_ID)) {
      this.set("toolbar", tb);
      return;
    }

    // Insert before the last button (delete)
    tb.splice(tb.length - 1, 0, {
      id: SAVE_BLOCK_ID,
      label: SAVE_SVG,
      command: SAVE_BLOCK_CMD,
      attributes: { title: "Сохранить блок в библиотеку" },
    });

    this.set("toolbar", tb);
  };
}
