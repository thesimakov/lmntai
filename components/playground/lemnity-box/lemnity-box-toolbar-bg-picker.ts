import type { Component, Editor } from "grapesjs";

const BG_PICKER_ID = "lemnity-bg-picker-btn";
const BG_PICKER_CMD = "lemnity-bg-picker";

const BG_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`;

type ToolbarRow = { id?: string; label?: string; command?: string; attributes?: Record<string, string> };

export function registerLemnityBoxToolbarBgPicker(
  editor: Editor,
  onOpen: (component: Component) => void,
): void {
  editor.Commands.add(BG_PICKER_CMD, {
    run(ed) {
      const sel = ed.getSelected();
      if (sel) onOpen(sel);
    },
  });

  const dc = editor.DomComponents;
  const type = dc.getType("default");
  const Model = type?.model as { prototype: { initToolbar: () => void; _lmnBgPatchApplied?: boolean } } | undefined;
  if (!Model?.prototype?.initToolbar) return;
  if (Model.prototype._lmnBgPatchApplied) return;
  Model.prototype._lmnBgPatchApplied = true;

  const proto = Model.prototype as {
    initToolbar: () => void;
    get: (k: string) => unknown;
    set: (k: string, v: unknown) => void;
  };
  const original = proto.initToolbar;

  proto.initToolbar = function patchedBgPickerToolbar(this: typeof proto) {
    original.call(this);
    if (String(this.get("tagName") ?? "").toLowerCase() !== "section") return;
    const raw = this.get("toolbar");
    if (!Array.isArray(raw)) return;
    const tb = raw.slice() as ToolbarRow[];
    if (tb.some((b) => b.id === BG_PICKER_ID)) {
      this.set("toolbar", tb);
      return;
    }
    // Insert before the last button (delete)
    tb.splice(tb.length - 1, 0, {
      id: BG_PICKER_ID,
      label: BG_ICON,
      command: BG_PICKER_CMD,
      attributes: { title: "Фон секции" },
    });
    this.set("toolbar", tb);
  };
}
