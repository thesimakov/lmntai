import type { Component, Editor } from "grapesjs";

const CMD_SETTINGS = "lemnity-block-settings-modal";
const TB_SETTINGS_ID = "lemnity-block-settings";

const GEAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.07.63-.07.94s.02.63.06.93l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>';

type ToolbarRow = {
  id?: string;
  label?: unknown;
  command?: unknown;
  attributes?: Record<string, string>;
};

type Slot = {
  el: HTMLElement;
  parent: HTMLElement | null;
  next: ChildNode | null;
};

function captureSlot(el: HTMLElement | null | undefined): Slot | null {
  if (!(el instanceof HTMLElement)) return null;
  const parent = el.parentElement;
  const next = el.nextSibling;
  return { el, parent, next };
}

function restoreSlot(slot: Slot | null) {
  if (!slot?.parent) return;
  slot.parent.insertBefore(slot.el, slot.next);
}

/** Редактирование HTML/текста в модалке — простые узлы без тяжёлых вложений */
function shouldOfferInlineTextEditor(comp: Component): boolean {
  const tag = String(comp.get("tagName") ?? "").toLowerCase();
  const el = comp.getEl?.();
  if (!(el instanceof HTMLElement)) return false;

  if (tag === "div") {
    if (
      el.querySelector(
        "img,video,iframe,svg,canvas,table,form,input,textarea,select,section,article,.lemnity-section,.lemnity-basic-w",
      )
    ) {
      return false;
    }
    const html = el.innerHTML.trim();
    return html.length <= 12000;
  }

  const allowed = new Set([
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "a",
    "label",
    "button",
    "li",
    "td",
    "th",
    "blockquote",
    "figcaption",
    "strong",
    "em",
    "code",
    "small",
  ]);
  if (!allowed.has(tag)) return false;
  if (el.querySelector("img,video,iframe,svg,canvas,table,form,input,textarea,select,button")) {
    if (tag !== "button" && tag !== "label" && tag !== "a") return false;
    if (tag === "button" || tag === "a") {
      /* допускаем простые кнопки/ссылки без медиа внутри */
      if (el.querySelector("img,video,iframe,svg")) return false;
    }
  }
  return true;
}

function resolveComponentDisplayName(comp: Component): string {
  try {
    const gn = comp.getName?.();
    if (typeof gn === "string" && gn.trim()) return gn.trim();
  } catch {
    /* noop */
  }
  const nm = comp.get?.("name");
  if (typeof nm === "string" && nm.trim()) return nm.trim();
  const tag = String(comp.get?.("tagName") ?? "").toUpperCase();
  return tag || "Блок";
}

function getTraitsRootEl(editor: Editor): HTMLElement | null {
  const tv = editor.Traits?.getTraitsViewer?.() as unknown as { el?: HTMLElement } | undefined;
  const el = tv?.el;
  return el instanceof HTMLElement ? el : null;
}

function getStylesRootEl(editor: Editor): HTMLElement | null {
  const sm = editor.StyleManager as unknown as { view?: { el?: HTMLElement } };
  const el = sm?.view?.el;
  return el instanceof HTMLElement ? el : null;
}

function wireTextSection(editor: Editor, comp: Component, mount: HTMLElement): (() => void) | undefined {
  if (!shouldOfferInlineTextEditor(comp)) return undefined;

  const wrap = document.createElement("div");
  wrap.className = "lemnity-box-settings-modal-text-section";

  const lab = document.createElement("div");
  lab.className = "lemnity-box-settings-modal-section-title";
  lab.textContent = "Текст";

  const ta = document.createElement("textarea");
  ta.className = "lemnity-box-settings-modal-textarea";
  ta.rows = 6;
  ta.spellcheck = true;

  const el = comp.getEl?.();
  if (el instanceof HTMLElement) {
    ta.value = el.innerHTML.trim() === "" ? "" : el.innerHTML;
  }

  let tmr = 0;
  const syncFromDom = () => {
    const dom = comp.getEl?.();
    if (!(dom instanceof HTMLElement)) return;
    ta.value = dom.innerHTML;
  };

  const apply = () => {
    window.clearTimeout(tmr);
    tmr = window.setTimeout(() => {
      try {
        comp.components(ta.value);
        editor.refresh();
      } catch {
        /* разбор HTML мог не удалиться — оставляем поле как есть */
      }
    }, 140);
  };

  ta.addEventListener("input", apply);

  const onCompUp = () => {
    if (document.activeElement === ta) return;
    syncFromDom();
  };
  editor.on("component:update", onCompUp);

  wrap.appendChild(lab);
  wrap.appendChild(ta);
  mount.appendChild(wrap);

  return () => {
    window.clearTimeout(tmr);
    editor.off?.("component:update", onCompUp);
    ta.removeEventListener("input", apply);
    wrap.remove();
  };
}

function openBlockSettingsModal(editor: Editor) {
  const modal = editor.Modal;
  const selected = editor.getSelected();

  if (!selected) {
    modal.open({
      title: "Настройки",
      content:
        '<p class="lemnity-box-settings-modal-empty">Выберите блок на странице и откройте «Настройки» снова.</p>',
      attributes: { class: "lemnity-box-settings-modal-dialog" },
    });
    return;
  }

  editor.Traits?.select?.(selected);
  editor.StyleManager?.select?.(selected as never);

  const shell = document.createElement("div");
  shell.className = "lemnity-box-settings-modal-shell";

  const detachText = wireTextSection(editor, selected, shell);

  const traitsMount = document.createElement("div");
  traitsMount.className = "lemnity-box-settings-modal-mount";

  const traitsTitle = document.createElement("div");
  traitsTitle.className = "lemnity-box-settings-modal-section-title";
  traitsTitle.textContent = "Параметры";

  const traitsSlot = document.createElement("div");
  traitsSlot.className = "lemnity-box-settings-modal-slot";

  const stylesMount = document.createElement("div");
  stylesMount.className = "lemnity-box-settings-modal-mount";

  const stylesTitle = document.createElement("div");
  stylesTitle.className = "lemnity-box-settings-modal-section-title";
  stylesTitle.textContent = "Стили";

  const stylesSlot = document.createElement("div");
  stylesSlot.className = "lemnity-box-settings-modal-slot";

  traitsMount.appendChild(traitsTitle);
  traitsMount.appendChild(traitsSlot);
  stylesMount.appendChild(stylesTitle);
  stylesMount.appendChild(stylesSlot);
  shell.appendChild(traitsMount);
  shell.appendChild(stylesMount);

  let traitsSlotSaved: Slot | null = null;
  let stylesSlotSaved: Slot | null = null;

  const syncTraitsMountVisibility = () => {
    try {
      const list = editor.Traits?.getTraits?.() ?? [];
      traitsMount.style.display = list.length === 0 ? "none" : "";
    } catch {
      traitsMount.style.display = "";
    }
  };

  let onTraitSync: (() => void) | undefined;

  const title = `Настройки · ${resolveComponentDisplayName(selected)}`;

  modal.open({
    title,
    content: shell,
    attributes: { class: "lemnity-box-settings-modal-dialog" },
  });

  modal.onceOpen(() => {
    const tr = getTraitsRootEl(editor);
    const sr = getStylesRootEl(editor);
    traitsSlotSaved = captureSlot(tr);
    stylesSlotSaved = captureSlot(sr);
    if (tr) traitsSlot.appendChild(tr);
    if (sr) stylesSlot.appendChild(sr);
    onTraitSync = () => {
      if (!modal.isOpen?.()) return;
      syncTraitsMountVisibility();
    };
    queueMicrotask(() => {
      editor.refresh?.();
      syncTraitsMountVisibility();
    });
    editor.on("component:update", onTraitSync as never);
  });

  modal.onceClose(() => {
    if (onTraitSync) editor.off?.("component:update", onTraitSync as never);
    onTraitSync = undefined;
    traitsMount.style.display = "";
    detachText?.();
    restoreSlot(traitsSlotSaved);
    restoreSlot(stylesSlotSaved);
    traitsSlotSaved = null;
    stylesSlotSaved = null;
    queueMicrotask(() => editor.refresh?.());
  });
}

/**
 * Кнопка «Настройки» на плавающем тулбаре компонента: модальное окно с текстом (если уместно),
 * блоками «Параметры» и «Стили» (перенос DOM Trait / Style manager — как полная панель Тильды).
 *
 * Должно вызываться после {@link registerLemnityBoxToolbarSiblingMoves}, чтобы патч initToolbar цепочкой обернул предыдущий.
 */
export function registerLemnityBoxBlockSettingsToolbar(editor: Editor): void {
  editor.Commands.add(CMD_SETTINGS, {
    run(ed: Editor) {
      openBlockSettingsModal(ed);
    },
  });

  const dc = editor.DomComponents;
  const type = dc.getType("default");
  const Model = type?.model as { prototype: { initToolbar?: () => void } } | undefined;
  if (!Model?.prototype?.initToolbar) return;

  const proto = Model.prototype;
  const previousInit = proto.initToolbar;
  if (typeof previousInit !== "function") return;

  proto.initToolbar = function patchedSettingsToolbar(this: {
    get: (k: string) => unknown;
    set: (k: string, v: unknown) => void;
  }) {
    previousInit.call(this);
    const raw = this.get("toolbar");
    if (!Array.isArray(raw)) return;

    let tb = raw.slice() as ToolbarRow[];
    if (tb.some((b) => b.id === TB_SETTINGS_ID)) {
      this.set("toolbar", tb);
      return;
    }

    tb = tb.filter((b) => b.id !== TB_SETTINGS_ID);

    const exitIdx = tb.findIndex((b) => typeof b.command === "function");
    const insertAt = exitIdx >= 0 ? exitIdx + 1 : 0;

    const settingsBtn: ToolbarRow = {
      id: TB_SETTINGS_ID,
      label: GEAR_SVG,
      command: CMD_SETTINGS,
      attributes: {
        title: "Настройки — параметры, стили и текст блока",
      },
    };

    tb.splice(insertAt, 0, settingsBtn);
    this.set("toolbar", tb);
  };
}
