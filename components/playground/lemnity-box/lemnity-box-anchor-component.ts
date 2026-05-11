import type { Component, Editor, ToHTMLOptions } from "grapesjs";

import { slugifyLnAnchorId } from "@/lib/lemnity-anchor-slug";

const TYPE_ID = "lemnity-anchor-block";
const ATTR_FLAG = "data-ln-anchor";
const PROP_SLUG = "ln-anchor-slug";

const DEFAULT_SLUG = "sec-block";

const ANCHOR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#2563eb" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>`;

function escapeHtmlAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function syncSlugToDom(comp: Component): void {
  const slug = slugifyLnAnchorId(
    String(comp.get(PROP_SLUG) ?? (comp.getAttributes?.()?.id as string | undefined) ?? DEFAULT_SLUG),
  );
  const el = comp.view?.el;
  if (el instanceof HTMLElement) {
    el.id = slug;
    renderAnchorChrome(el, slug);
  }
}

function renderAnchorChrome(host: HTMLElement, slug: string): void {
  let ui = host.querySelector(":scope > .lemnity-anchor-editor-only");
  if (!(ui instanceof HTMLElement)) {
    ui = document.createElement("div");
    ui.className = "lemnity-anchor-editor-only";
    ui.setAttribute("aria-hidden", "true");
    host.insertBefore(ui, host.firstChild);
  }
  ui.innerHTML = `
<div style="display:flex;align-items:stretch;gap:0;border-radius:14px;overflow:hidden;background:linear-gradient(145deg,#2563eb 0%,#1d4ed8 55%,#1e40af 100%);color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 28px rgba(37,99,235,.28);">
  <div style="flex:1;padding:14px 16px 16px;display:flex;align-items:center;gap:14px;min-width:0;">
    <span style="flex-shrink:0;width:44px;height:44px;border-radius:999px;background:rgba(255,255,255,.96);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(15,23,42,.12);">${ANCHOR_ICON_SVG}</span>
    <div style="flex:1;min-width:0;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.88;">Якорь страницы</div>
      <div style="font-weight:800;font-size:clamp(17px,3.5vw,22px);margin-top:6px;line-height:1.15;word-break:break-all;"><span style="opacity:.85;">#</span>${escapeHtmlAttr(slug)}</div>
      <div style="margin-top:8px;font-size:12px;line-height:1.45;opacity:.88;">В меню и кнопках укажите ссылку вида <strong style="font-weight:700;color:#fff;">#${escapeHtmlAttr(slug)}</strong></div>
    </div>
  </div>
  <div style="width:42px;flex-shrink:0;background:rgba(255,255,255,.14);display:flex;align-items:flex-start;justify-content:center;padding-top:10px;border-left:1px solid rgba(255,255,255,.22);">
    <span style="display:grid;grid-template-columns:repeat(2,4px);gap:5px;opacity:.85;">
      <span style="width:4px;height:4px;border-radius:50%;background:#fff;"></span>
      <span style="width:4px;height:4px;border-radius:50%;background:#fff;"></span>
      <span style="width:4px;height:4px;border-radius:50%;background:#fff;"></span>
      <span style="width:4px;height:4px;border-radius:50%;background:#fff;"></span>
      <span style="width:4px;height:4px;border-radius:50%;background:#fff;"></span>
      <span style="width:4px;height:4px;border-radius:50%;background:#fff;"></span>
    </span>
  </div>
</div>`;
}

function registerLemnityAnchorType(editor: Editor): void {
  editor.DomComponents.addType(TYPE_ID, {
    isComponent: (el) => el.getAttribute?.(ATTR_FLAG) === "1",
    extend: "default",
    model: {
      defaults: {
        type: TYPE_ID,
        tagName: "div",
        name: "Якорь",
        draggable: true,
        droppable: false,
        layerable: true,
        highlightable: true,
        copyable: true,
        removable: true,
        traits: [
          {
            type: "text",
            name: PROP_SLUG,
            label: "ID якоря (без #)",
            changeProp: true,
            placeholder: "services",
          },
        ],
        attributes: {
          [ATTR_FLAG]: "1",
          id: DEFAULT_SLUG,
          class: "lemnity-anchor",
        },
        [PROP_SLUG]: DEFAULT_SLUG,
      },
      init(this: Component) {
        const attrs = this.getAttributes?.() ?? {};
        const fromAttr =
          typeof attrs.id === "string" && attrs.id.trim().length > 0 ? slugifyLnAnchorId(attrs.id) : "";
        const rawProp = this.get(PROP_SLUG);
        const fromProp =
          typeof rawProp === "string" && rawProp.trim().length > 0 ? slugifyLnAnchorId(rawProp) : "";
        const initial = fromAttr || fromProp || DEFAULT_SLUG;
        this.set(PROP_SLUG, initial, { silent: true } as never);
        this.addAttributes({ id: initial, class: "lemnity-anchor" });

        this.on(`change:${PROP_SLUG}`, () => {
          const next = slugifyLnAnchorId(String(this.get(PROP_SLUG)));
          if (next !== this.get(PROP_SLUG)) {
            this.set(PROP_SLUG, next);
            return;
          }
          this.addAttributes({ id: next });
          syncSlugToDom(this);
        });

        queueMicrotask(() => syncSlugToDom(this));
      },
      toHTML(this: Component, opts?: ToHTMLOptions) {
        const slug = slugifyLnAnchorId(String(this.get(PROP_SLUG) ?? this.getAttributes?.()?.id ?? DEFAULT_SLUG));
        const attrOpts = opts?.attributes ?? {};
        const extra = Object.entries(attrOpts)
          .filter(([k]) => k !== "id" && k !== ATTR_FLAG && k !== "class")
          .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, "&quot;")}"`)
          .join("");
        /* Внутренний блок показывается только в редакторе; на сайте скрывается через inject CSS */
        return `<div ${ATTR_FLAG}="1" id="${escapeHtmlAttr(slug)}" class="lemnity-anchor"${extra}><div class="lemnity-anchor-editor-only" aria-hidden="true"></div></div>`;
      },
    },
    view: {
      onRender(this: { model: Component; el: HTMLElement }) {
        const slug = slugifyLnAnchorId(String(this.model.get(PROP_SLUG) ?? this.model.getAttributes?.()?.id ?? DEFAULT_SLUG));
        renderAnchorChrome(this.el, slug);
      },
    },
  });
}

/**
 * Якорная метка: задайте ID и ссылайтесь из меню/кнопок как href="#id".
 */
export function attachLemnityBoxAnchorComponent(editor: Editor): () => void {
  registerLemnityAnchorType(editor);
  return () => {};
}
