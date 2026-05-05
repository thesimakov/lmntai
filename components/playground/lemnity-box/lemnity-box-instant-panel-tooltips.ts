import type { Editor } from "grapesjs";

/** Убирает нативный title (задержка ~1s) и переносит текст в data-gjs-instant-tip для CSS-подсказки без задержки. */
export function applyLemnityBoxInstantPanelTooltips(editor: Editor, editorMountEl: HTMLElement | null) {
  if (!editorMountEl) return;
  const root = editorMountEl.closest(".gjs-editor") ?? editorMountEl;
  const buttons = root.querySelectorAll<HTMLElement>(".gjs-pn-btn");
  buttons.forEach((btn) => {
    const tip = btn.getAttribute("title")?.trim();
    if (!tip) return;
    btn.setAttribute("data-gjs-instant-tip", tip);
    btn.removeAttribute("title");
    if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", tip);
  });
}
