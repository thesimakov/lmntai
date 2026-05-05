import type { Component, Editor, ToHTMLOptions } from "grapesjs";

import { encodeLnHtmlSnippetUtf8, decodeLnHtmlSnippetUtf8 } from "@/lib/lemnity-box-html-embed-expand";

const TYPE_ID = "lemnity-html-embed";
const PROP = "ln-html-snippet";

const DEFAULT_SNIPPET = `<style>
.btn { padding: 15px 30px; color: #fff; border: none; background: #2563eb; border-radius: 8px; cursor: pointer; font-family: system-ui, sans-serif; font-weight: 600; }
</style>
<button type="button" class="btn">Заказать</button>`;

function syncEmbedDom(comp: Component): void {
  const html = String(comp.get(PROP) ?? "");
  const el = comp.view?.el;
  if (el instanceof HTMLElement) {
    el.innerHTML = html;
  }
}

function registerLemnityHtmlEmbedType(editor: Editor): void {
  const dc = editor.DomComponents;

  dc.addType(TYPE_ID, {
    isComponent: (el) => el.getAttribute?.("data-ln-html-embed") === "1",
    extend: "default",
    model: {
      defaults: {
        type: TYPE_ID,
        tagName: "div",
        name: "HTML-секция",
        draggable: true,
        droppable: false,
        layerable: true,
        highlightable: true,
        traits: [
          {
            type: "textarea",
            name: PROP,
            label: "Код (HTML / CSS / JS)",
            changeProp: true,
            placeholder: "<style>…</style>\n<div>…</div>",
          },
        ],
        attributes: {
          "data-ln-html-embed": "1",
        },
        classes: ["lemnity-html-root"],
        "ln-html-snippet": DEFAULT_SNIPPET,
      },
      init(this: Component) {
        const attrs = this.getAttributes?.() ?? {};
        const rawAttr = attrs["data-ln-raw"];
        if (typeof rawAttr === "string" && rawAttr.length > 0) {
          const dec = decodeLnHtmlSnippetUtf8(rawAttr);
          if (dec) this.set(PROP, dec, { silent: true } as never);
        }

        this.on(`change:${PROP}`, () => {
          syncEmbedDom(this);
        });

        queueMicrotask(() => syncEmbedDom(this));
      },
      toHTML(this: Component, opts?: ToHTMLOptions) {
        const raw = String(this.get(PROP) ?? "");
        const b64 = encodeLnHtmlSnippetUtf8(raw);
        const cls = this.getClasses?.();
        const classStr = Array.isArray(cls) && cls.length ? cls.join(" ") : "lemnity-html-root";
        const attrOpts = opts?.attributes ?? {};
        const extra = Object.entries(attrOpts)
          .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, "&quot;")}"`)
          .join("");
        return `<div data-ln-html-embed="1" data-ln-raw="${b64}" class="${classStr}"${extra}></div>`;
      },
    },
    view: {
      onRender(this: { model: Component; el: HTMLElement }) {
        this.el.innerHTML = String(this.model.get(PROP) ?? "");
      },
    },
  });
}

/**
 * Регистрирует тип компонента для вставки произвольного HTML/CSS/JS с редактированием в textarea traits.
 * Должен вызываться до разбора контента (например, первым plugin в grapesjs.init).
 */
export function attachLemnityBoxHtmlEmbed(editor: Editor): () => void {
  registerLemnityHtmlEmbedType(editor);
  return () => {
    /* тип DomComponents не снимается — отписка не требуется */
  };
}
