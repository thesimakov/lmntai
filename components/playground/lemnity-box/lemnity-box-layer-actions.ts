import type { Component, Editor } from "grapesjs";

/** Событие Grapes Layers (navigator): см. Layers module — trigger после каждого __render строки */
const EVT_LAYER_RENDER = "layer:render";

const ICON_DELETE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>';

const ICON_CLONE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

type LayerRenderPayload = { component: Component; el: HTMLElement };

function resolveLayerRowEl(el: HTMLElement): HTMLElement | null {
  if (el.matches(".gjs-layer-item")) return el;
  const direct = el.querySelector(":scope > .gjs-layer-item");
  if (direct instanceof HTMLElement) return direct;
  const nested = el.querySelector(".gjs-layer-item");
  return nested instanceof HTMLElement ? nested : null;
}

function isEditorWrapper(editor: Editor, cmp: Component | null | undefined): boolean {
  if (!cmp?.get || typeof editor.getWrapper !== "function") return false;
  const wrap = editor.getWrapper();
  return Boolean(wrap && cmp === wrap);
}


function mkActionBtn(opts: { ariaLabel: string; title: string; iconHtml: string; variant: "delete" | "clone" }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `lemnity-layer-action lemnity-layer-action--${opts.variant}`;
  btn.setAttribute("aria-label", opts.ariaLabel);
  btn.title = opts.title;
  btn.innerHTML = opts.iconHtml;
  return btn;
}

/** Кнопки «Удалить» / «Дублировать» в каждой строке панели «Слои». */
export function attachLemnityBoxLayerActions(editor: Editor): () => void {
  const onLayerRender = (payload: unknown) => {
    const raw = payload as Partial<LayerRenderPayload>;
    const comp = raw.component;
    const rootEl = raw.el;
    if (!comp || !(rootEl instanceof HTMLElement)) return;
    if (isEditorWrapper(editor, comp)) return;

    const itemEl = resolveLayerRowEl(rootEl);
    if (!itemEl) return;

    const right = itemEl.querySelector(":scope > .gjs-layer-item-right");
    if (!(right instanceof HTMLElement)) return;

    const removable = comp.get?.("removable") !== false;
    const copyable = comp.get?.("copyable") !== false;

    let actions = right.querySelector<HTMLElement>(":scope > .lemnity-layer-actions");
    if (!removable && !copyable) {
      actions?.remove();
      return;
    }

    if (!actions) {
      actions = document.createElement("div");
      actions.className = "lemnity-layer-actions";
      const move = right.querySelector(".gjs-layer-move");
      if (move) right.insertBefore(actions, move);
      else right.appendChild(actions);
    } else {
      actions.replaceChildren();
    }

    const stopNav = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (removable) {
      const del = mkActionBtn({
        ariaLabel: "Удалить элемент",
        title: "Удалить",
        iconHtml: ICON_DELETE,
        variant: "delete",
      });
      del.addEventListener("pointerdown", stopNav);
      del.addEventListener("click", (e) => {
        stopNav(e);
        try {
          editor.select(comp);
          editor.runCommand("core:component-delete");
        } catch {
          /* noop */
        }
      });
      actions.appendChild(del);
    }

    if (copyable) {
      const dup = mkActionBtn({
        ariaLabel: "Дублировать элемент",
        title: "Дублировать",
        iconHtml: ICON_CLONE,
        variant: "clone",
      });
      dup.addEventListener("pointerdown", stopNav);
      dup.addEventListener("click", (e) => {
        stopNav(e);
        editor.select(comp);
        editor.runCommand("tlb-clone");
      });
      actions.appendChild(dup);
    }
  };

  editor.on(EVT_LAYER_RENDER, onLayerRender);
  return () => {
    editor.off(EVT_LAYER_RENDER, onLayerRender);
  };
}
