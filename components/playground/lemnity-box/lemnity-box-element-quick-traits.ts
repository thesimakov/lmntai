import type { Component, Editor, TraitProperties } from "grapesjs";

const HOVER_STYLE_ID = "lemnity-element-traits-hover";

const HOVER_CSS = `
a.lemnity-trait-cta-hover:hover,
button.lemnity-trait-cta-hover:hover,
a.lemnity-trait-bg-hover:hover,
button.lemnity-trait-bg-hover:hover {
  background-color: var(--ln-hbg, inherit) !important;
  color: var(--ln-hcolor, inherit) !important;
  border-color: var(--ln-hborder, inherit) !important;
}
`;

function injectHoverCss(editor: Editor): void {
  const doc = editor.Canvas?.getDocument?.();
  if (!doc?.head || doc.getElementById(HOVER_STYLE_ID)) return;
  const s = doc.createElement("style");
  s.id = HOVER_STYLE_ID;
  s.textContent = HOVER_CSS.trim();
  doc.head.appendChild(s);
}

const CAT_LINK: TraitProperties["category"] = { id: "ln-cat-link", label: "Ссылка" };
const CAT_LOOK: TraitProperties["category"] = { id: "ln-cat-look", label: "Внешний вид" };
const CAT_TEXT: TraitProperties["category"] = { id: "ln-cat-text", label: "Текст" };
const CAT_MEDIA: TraitProperties["category"] = { id: "ln-cat-media", label: "Медиа" };
const CAT_SECTION: TraitProperties["category"] = { id: "ln-cat-section", label: "Секция" };
const CAT_BTN: TraitProperties["category"] = { id: "ln-cat-btn", label: "Кнопка" };
const CAT_HOVER: TraitProperties["category"] = { id: "ln-cat-hover", label: "При наведении" };

const LINK_TYPE_ATTR = "data-ln-link-type";

function canEditCtaPlainLabel(comp: Component): boolean {
  const el = comp.getEl?.();
  return el instanceof HTMLElement && !el.querySelector("img,svg,iframe,video");
}

function getCtaPlainLabel(comp: Component): string {
  return comp.getEl?.()?.textContent?.trim() ?? "";
}

function setCtaPlainLabel(comp: Component, raw: string): void {
  const el = comp.getEl?.();
  if (!(el instanceof HTMLElement)) return;
  if (!canEditCtaPlainLabel(comp)) return;
  el.textContent = String(raw ?? "");
}

function ensureCtaHoverClass(comp: Component): void {
  comp.addClass?.("lemnity-trait-cta-hover");
}

function hasTrait(comp: Component, id: string): boolean {
  try {
    return comp.getTraitIndex(id) >= 0;
  } catch {
    return false;
  }
}

function styleGet(comp: Component, key: string): string {
  const st = comp.getStyle?.() ?? {};
  const v = st[key];
  return typeof v === "string" ? v : "";
}

/** Вкладки виджета — не трогаем как «кнопку CTA». */
function isTabTriggerButton(comp: Component): boolean {
  const el = comp.getEl?.();
  return el instanceof HTMLElement && el.classList.contains("lemnity-tab-trigger");
}

function addTraits(comp: Component, traits: TraitProperties[]): void {
  for (const tr of traits) {
    const id = String(tr.id ?? tr.name ?? "");
    if (!id || hasTrait(comp, id)) continue;
    comp.addTrait([tr]);
  }
}

function traitsCtaLabelTrait(comp: Component): TraitProperties[] {
  if (!canEditCtaPlainLabel(comp)) return [];
  return [
    {
      id: "ln-el-label",
      name: "ln-el-label",
      type: "text",
      label: "Название кнопки",
      category: CAT_BTN,
      placeholder: "Текст на кнопке",
      getValue({ component }) {
        return getCtaPlainLabel(component);
      },
      setValue({ component, value, emitUpdate }) {
        setCtaPlainLabel(component, String(value ?? ""));
        emitUpdate();
      },
    },
  ];
}

function traitsCtaLinkBlock(): TraitProperties[] {
  return [
    {
      id: "ln-el-href",
      name: "ln-el-href",
      type: "text",
      label: "Ссылка",
      category: CAT_LINK,
      placeholder: "http://",
      getValue({ component }) {
        return component.getAttributes?.()?.href ?? "";
      },
      setValue({ component, value, emitUpdate }) {
        const href = String(value ?? "").trim() || "#";
        component.addAttributes?.({ href });
        emitUpdate();
      },
    },
    {
      id: "ln-el-blank",
      name: "ln-el-blank",
      type: "checkbox",
      label: "В новом окне",
      category: CAT_LINK,
      valueTrue: "1",
      valueFalse: "",
      getValue({ component }) {
        return component.getAttributes?.()?.target === "_blank";
      },
      setValue({ component, value, emitUpdate }) {
        if (value) {
          component.addAttributes?.({ target: "_blank", rel: "noopener noreferrer" });
        } else {
          component.removeAttributes?.(["target", "rel"]);
        }
        emitUpdate();
      },
    },
    {
      id: "ln-el-link-type",
      name: "ln-el-link-type",
      type: "select",
      label: "Тип ссылки",
      category: CAT_LINK,
      options: [
        { id: "page", name: "Страница" },
        { id: "block", name: "Блок" },
        { id: "url", name: "Внешняя ссылка" },
      ],
      getValue({ component }) {
        const attrs = component.getAttributes?.() as Record<string, unknown> | undefined;
        const v = attrs?.[LINK_TYPE_ATTR];
        const s = typeof v === "string" ? v : "";
        return s === "page" || s === "block" ? s : "url";
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "url");
        if (v === "page" || v === "block") {
          component.addAttributes?.({ [LINK_TYPE_ATTR]: v });
        } else {
          component.removeAttributes?.([LINK_TYPE_ATTR]);
        }
        emitUpdate();
      },
    },
  ];
}

/** Обычное состояние + скругление; hover задаётся отдельной группой. */
function traitsCtaVisualTraits(): TraitProperties[] {
  return [
    {
      id: "ln-el-font-size",
      name: "ln-el-font-size",
      type: "text",
      label: "Размер текста",
      category: CAT_TEXT,
      placeholder: "напр. 16px",
      getValue({ component }) {
        return styleGet(component, "font-size");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ "font-size": v });
        else component.removeStyle?.("font-size");
        emitUpdate();
      },
    },
    {
      id: "ln-el-color",
      name: "ln-el-color",
      type: "color",
      label: "Цвет текста",
      category: CAT_LOOK,
      getValue({ component }) {
        return styleGet(component, "color") || "#000000";
      },
      setValue({ component, value, emitUpdate }) {
        component.addStyle?.({ color: String(value ?? "#000000") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-bg",
      name: "ln-el-bg",
      type: "color",
      label: "Цвет фона",
      category: CAT_LOOK,
      getValue({ component }) {
        return styleGet(component, "background-color") || "#ffffff";
      },
      setValue({ component, value, emitUpdate }) {
        component.addStyle?.({ "background-color": String(value ?? "#ffffff") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-border-color",
      name: "ln-el-border-color",
      type: "color",
      label: "Цвет обводки",
      category: CAT_LOOK,
      getValue({ component }) {
        return styleGet(component, "border-color") || "#000000";
      },
      setValue({ component, value, emitUpdate }) {
        component.addStyle?.({ "border-color": String(value ?? "#000000") });
        const w = styleGet(component, "border-width").trim();
        if (!w || w === "0") {
          component.addStyle?.({ "border-width": "1px", "border-style": "solid" });
        } else if (!styleGet(component, "border-style")) {
          component.addStyle?.({ "border-style": "solid" });
        }
        emitUpdate();
      },
    },
    {
      id: "ln-el-border-width",
      name: "ln-el-border-width",
      type: "text",
      label: "Толщина обводки",
      category: CAT_LOOK,
      placeholder: "напр. 3px",
      getValue({ component }) {
        return styleGet(component, "border-width");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v && v !== "0") {
          component.addStyle?.({ "border-width": v, "border-style": "solid" });
        } else {
          component.removeStyle?.("border-width");
          component.removeStyle?.("border-style");
          component.removeStyle?.("border-color");
        }
        emitUpdate();
      },
    },
    {
      id: "ln-el-radius",
      name: "ln-el-radius",
      type: "text",
      label: "Скругление",
      category: CAT_LOOK,
      placeholder: "напр. 5px",
      getValue({ component }) {
        return styleGet(component, "border-radius");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ "border-radius": v });
        else component.removeStyle?.("border-radius");
        emitUpdate();
      },
    },
    {
      id: "ln-el-hover-color",
      name: "ln-el-hover-color",
      type: "color",
      label: "Цвет текста при наведении",
      category: CAT_HOVER,
      getValue({ component }) {
        return styleGet(component, "--ln-hcolor") || "#000000";
      },
      setValue({ component, value, emitUpdate }) {
        ensureCtaHoverClass(component);
        component.addStyle?.({ "--ln-hcolor": String(value ?? "#000000") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-hover-bg",
      name: "ln-el-hover-bg",
      type: "color",
      label: "Цвет фона при наведении",
      category: CAT_HOVER,
      getValue({ component }) {
        return styleGet(component, "--ln-hbg") || "#cccccc";
      },
      setValue({ component, value, emitUpdate }) {
        ensureCtaHoverClass(component);
        component.addStyle?.({ "--ln-hbg": String(value ?? "transparent") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-hover-border",
      name: "ln-el-hover-border",
      type: "color",
      label: "Цвет обводки при наведении",
      category: CAT_HOVER,
      getValue({ component }) {
        return styleGet(component, "--ln-hborder") || "#000000";
      },
      setValue({ component, value, emitUpdate }) {
        ensureCtaHoverClass(component);
        component.addStyle?.({ "--ln-hborder": String(value ?? "#000000") });
        emitUpdate();
      },
    },
  ];
}

function traitsCtaLinkLike(comp: Component): TraitProperties[] {
  return [...traitsCtaLabelTrait(comp), ...traitsCtaLinkBlock(), ...traitsCtaVisualTraits()];
}

function traitsCtaButtonLike(comp: Component): TraitProperties[] {
  return [...traitsCtaLabelTrait(comp), ...traitsCtaVisualTraits()];
}

function traitsLinkLike(comp: Component): void {
  try {
    if ((comp.getTraitIndex?.("ln-el-target") ?? -1) >= 0) {
      comp.removeTrait?.("ln-el-target");
    }
  } catch {
    /* noop */
  }
  addTraits(comp, traitsCtaLinkLike(comp));
  ensureCtaHoverClass(comp);
}

function traitsTypographyAndShape(comp: Component, _kind: string): TraitProperties[] {
  void _kind;
  return [
    {
      id: "ln-el-font-size",
      name: "ln-el-font-size",
      type: "text",
      label: "Размер текста",
      category: CAT_TEXT,
      placeholder: "напр. 16px",
      getValue({ component }) {
        return styleGet(component, "font-size");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ "font-size": v });
        else component.removeStyle?.("font-size");
        emitUpdate();
      },
    },
    {
      id: "ln-el-font-weight",
      name: "ln-el-font-weight",
      type: "select",
      label: "Начертание",
      category: CAT_TEXT,
      options: [
        { id: "400", name: "Обычный" },
        { id: "500", name: "Средний" },
        { id: "600", name: "Полужирный" },
        { id: "700", name: "Жирный" },
        { id: "800", name: "Очень жирный" },
      ],
      getValue({ component }) {
        const w = styleGet(component, "font-weight");
        return w && /^\d+$/.test(w) ? w : "400";
      },
      setValue({ component, value, emitUpdate }) {
        component.addStyle?.({ "font-weight": String(value ?? "400") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-text-align",
      name: "ln-el-text-align",
      type: "select",
      label: "Выравнивание текста",
      category: CAT_TEXT,
      options: [
        { id: "left", name: "Слева" },
        { id: "center", name: "По центру" },
        { id: "right", name: "Справа" },
      ],
      getValue({ component }) {
        const a = styleGet(component, "text-align");
        return a === "center" || a === "right" ? a : "left";
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "left");
        component.addStyle?.({ "text-align": v });
        emitUpdate();
      },
    },
    {
      id: "ln-el-color",
      name: "ln-el-color",
      type: "color",
      label: "Цвет текста",
      category: CAT_LOOK,
      getValue({ component }) {
        return styleGet(component, "color") || "#000000";
      },
      setValue({ component, value, emitUpdate }) {
        component.addStyle?.({ color: String(value ?? "#000000") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-bg",
      name: "ln-el-bg",
      type: "color",
      label: "Цвет фона",
      category: CAT_LOOK,
      getValue({ component }) {
        return styleGet(component, "background-color") || "#ffffff";
      },
      setValue({ component, value, emitUpdate }) {
        component.addStyle?.({ "background-color": String(value ?? "#ffffff") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-hover-bg",
      name: "ln-el-hover-bg",
      type: "color",
      label: "Цвет фона при наведении",
      category: CAT_LOOK,
      getValue({ component }) {
        return styleGet(component, "--ln-hbg") || "#cccccc";
      },
      setValue({ component, value, emitUpdate }) {
        component.addClass?.("lemnity-trait-bg-hover");
        component.addStyle?.({ "--ln-hbg": String(value ?? "transparent") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-radius",
      name: "ln-el-radius",
      type: "text",
      label: "Скругление (radius)",
      category: CAT_LOOK,
      placeholder: "напр. 8px или 999px",
      getValue({ component }) {
        return styleGet(component, "border-radius");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ "border-radius": v });
        else component.removeStyle?.("border-radius");
        emitUpdate();
      },
    },
    {
      id: "ln-el-pad",
      name: "ln-el-pad",
      type: "text",
      label: "Отступы (padding)",
      category: CAT_LOOK,
      placeholder: "напр. 12px 24px",
      getValue({ component }) {
        return styleGet(component, "padding");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ padding: v });
        else component.removeStyle?.("padding");
        emitUpdate();
      },
    },
  ];
}

function traitsButton(comp: Component): void {
  addTraits(comp, [
    ...traitsCtaLabelTrait(comp),
    {
      id: "ln-el-btn-type",
      name: "ln-el-btn-type",
      type: "select",
      label: "Тип кнопки",
      category: CAT_BTN,
      options: [
        { id: "button", name: "Кнопка" },
        { id: "submit", name: "Отправить" },
        { id: "reset", name: "Сброс" },
      ],
      getValue({ component }) {
        const t = (component.getAttributes?.()?.type ?? "button").toLowerCase();
        return t === "submit" || t === "reset" ? t : "button";
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "button");
        component.addAttributes?.({ type: v === "submit" || v === "reset" ? v : "button" });
        emitUpdate();
      },
    },
    ...traitsCtaVisualTraits(),
  ]);
  ensureCtaHoverClass(comp);
}

function traitsHeading(comp: Component): void {
  addTraits(comp, [
    {
      id: "ln-el-line-height",
      name: "ln-el-line-height",
      type: "text",
      label: "Межстрочный интервал",
      category: CAT_TEXT,
      placeholder: "напр. 1.2 или 28px",
      getValue({ component }) {
        return styleGet(component, "line-height");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ "line-height": v });
        else component.removeStyle?.("line-height");
        emitUpdate();
      },
    },
    ...traitsTypographyAndShape(comp, "heading"),
  ]);
}

function traitsParagraph(comp: Component): void {
  addTraits(comp, [
    {
      id: "ln-el-line-height",
      name: "ln-el-line-height",
      type: "text",
      label: "Межстрочный интервал",
      category: CAT_TEXT,
      placeholder: "напр. 1.6",
      getValue({ component }) {
        return styleGet(component, "line-height");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ "line-height": v });
        else component.removeStyle?.("line-height");
        emitUpdate();
      },
    },
    ...traitsTypographyAndShape(comp, "paragraph"),
  ]);
}

function traitsImage(comp: Component): void {
  addTraits(comp, [
    {
      id: "ln-el-img-src",
      name: "ln-el-img-src",
      type: "text",
      label: "Адрес изображения (src)",
      category: CAT_MEDIA,
      getValue({ component }) {
        return component.getAttributes?.()?.src ?? "";
      },
      setValue({ component, value, emitUpdate }) {
        component.addAttributes?.({ src: String(value ?? "") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-img-alt",
      name: "ln-el-img-alt",
      type: "text",
      label: "Alt (описание)",
      category: CAT_MEDIA,
      getValue({ component }) {
        return component.getAttributes?.()?.alt ?? "";
      },
      setValue({ component, value, emitUpdate }) {
        component.addAttributes?.({ alt: String(value ?? "") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-img-title",
      name: "ln-el-img-title",
      type: "text",
      label: "Подсказка (title)",
      category: CAT_MEDIA,
      getValue({ component }) {
        return component.getAttributes?.()?.title ?? "";
      },
      setValue({ component, value, emitUpdate }) {
        component.addAttributes?.({ title: String(value ?? "") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-img-radius",
      name: "ln-el-img-radius",
      type: "text",
      label: "Скругление",
      category: CAT_LOOK,
      placeholder: "напр. 12px",
      getValue({ component }) {
        return styleGet(component, "border-radius");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ "border-radius": v });
        else component.removeStyle?.("border-radius");
        emitUpdate();
      },
    },
    {
      id: "ln-el-img-maxw",
      name: "ln-el-img-maxw",
      type: "text",
      label: "Макс. ширина",
      category: CAT_LOOK,
      placeholder: "напр. 100% или 640px",
      getValue({ component }) {
        return styleGet(component, "max-width");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ "max-width": v });
        else component.removeStyle?.("max-width");
        emitUpdate();
      },
    },
  ]);
}

function traitsListItem(comp: Component): void {
  addTraits(comp, [...traitsTypographyAndShape(comp, "li")]);
}

function traitsSpan(comp: Component): void {
  addTraits(comp, [
    {
      id: "ln-el-font-size",
      name: "ln-el-font-size",
      type: "text",
      label: "Размер текста",
      category: CAT_TEXT,
      placeholder: "напр. 14px",
      getValue({ component }) {
        return styleGet(component, "font-size");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ "font-size": v });
        else component.removeStyle?.("font-size");
        emitUpdate();
      },
    },
    {
      id: "ln-el-color",
      name: "ln-el-color",
      type: "color",
      label: "Цвет текста",
      category: CAT_TEXT,
      getValue({ component }) {
        return styleGet(component, "color") || "#000000";
      },
      setValue({ component, value, emitUpdate }) {
        component.addStyle?.({ color: String(value ?? "#000000") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-font-weight",
      name: "ln-el-font-weight",
      type: "select",
      label: "Начертание",
      category: CAT_TEXT,
      options: [
        { id: "400", name: "Обычный" },
        { id: "600", name: "Полужирный" },
        { id: "700", name: "Жирный" },
      ],
      getValue({ component }) {
        const w = styleGet(component, "font-weight");
        return w && /^\d+$/.test(w) ? w : "400";
      },
      setValue({ component, value, emitUpdate }) {
        component.addStyle?.({ "font-weight": String(value ?? "400") });
        emitUpdate();
      },
    },
  ]);
}

function traitsSection(comp: Component): void {
  const el = comp.getEl?.();
  if (!(el instanceof HTMLElement) || !el.classList.contains("lemnity-section")) return;

  addTraits(comp, [
    {
      id: "ln-el-sec-padding",
      name: "ln-el-sec-padding",
      type: "text",
      label: "Внутренние отступы (padding)",
      category: CAT_SECTION,
      placeholder: "напр. 48px 24px",
      getValue({ component }) {
        return styleGet(component, "padding");
      },
      setValue({ component, value, emitUpdate }) {
        const v = String(value ?? "").trim();
        if (v) component.addStyle?.({ padding: v });
        else component.removeStyle?.("padding");
        emitUpdate();
      },
    },
    {
      id: "ln-el-sec-bg",
      name: "ln-el-sec-bg",
      type: "color",
      label: "Фон секции",
      category: CAT_SECTION,
      getValue({ component }) {
        return styleGet(component, "background-color") || "#ffffff";
      },
      setValue({ component, value, emitUpdate }) {
        component.addStyle?.({ "background-color": String(value ?? "#ffffff") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-sec-color",
      name: "ln-el-sec-color",
      type: "color",
      label: "Базовый цвет текста",
      category: CAT_SECTION,
      getValue({ component }) {
        return styleGet(component, "color") || "#0f172a";
      },
      setValue({ component, value, emitUpdate }) {
        component.addStyle?.({ color: String(value ?? "#0f172a") });
        emitUpdate();
      },
    },
  ]);
}

function traitsVideo(comp: Component): void {
  addTraits(comp, [
    {
      id: "ln-el-video-poster",
      name: "ln-el-video-poster",
      type: "text",
      label: "Постер (URL)",
      category: CAT_MEDIA,
      getValue({ component }) {
        return component.getAttributes?.()?.poster ?? "";
      },
      setValue({ component, value, emitUpdate }) {
        component.addAttributes?.({ poster: String(value ?? "") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-video-controls",
      name: "ln-el-video-controls",
      type: "checkbox",
      label: "Показывать панель управления",
      category: CAT_MEDIA,
      valueTrue: "true",
      valueFalse: "",
      getValue({ component }) {
        const el = component.getEl?.();
        return el instanceof HTMLElement && el.hasAttribute("controls");
      },
      setValue({ component, value, emitUpdate }) {
        if (value) component.addAttributes?.({ controls: "" });
        else component.removeAttributes?.("controls");
        emitUpdate();
      },
    },
  ]);
}

function traitsIframe(comp: Component): void {
  addTraits(comp, [
    {
      id: "ln-el-iframe-src",
      name: "ln-el-iframe-src",
      type: "text",
      label: "URL (src)",
      category: CAT_MEDIA,
      getValue({ component }) {
        return component.getAttributes?.()?.src ?? "";
      },
      setValue({ component, value, emitUpdate }) {
        component.addAttributes?.({ src: String(value ?? "") });
        emitUpdate();
      },
    },
    {
      id: "ln-el-iframe-title",
      name: "ln-el-iframe-title",
      type: "text",
      label: "Заголовок (title)",
      category: CAT_MEDIA,
      getValue({ component }) {
        return component.getAttributes?.()?.title ?? "";
      },
      setValue({ component, value, emitUpdate }) {
        component.addAttributes?.({ title: String(value ?? "") });
        emitUpdate();
      },
    },
  ]);
}

const SKIP_TAGS = new Set(["style", "script", "noscript", "meta", "link", "base", "template", "br", "hr"]);

function ensureTraitsForComponent(comp: Component): void {
  const typ = comp.get?.("type");
  if (typ === "wrapper") return;

  const tag = String(comp.get?.("tagName") ?? "").toLowerCase();
  if (!tag || SKIP_TAGS.has(tag)) return;

  if (tag === "a") {
    if (!hasTrait(comp, "ln-el-blank")) traitsLinkLike(comp);
    return;
  }
  if (tag === "button") {
    if (isTabTriggerButton(comp)) return;
    if (!hasTrait(comp, "ln-el-hover-border")) traitsButton(comp);
    return;
  }
  if (tag === "img") {
    if (!hasTrait(comp, "ln-el-img-src")) traitsImage(comp);
    return;
  }
  if (/^h[1-6]$/.test(tag)) {
    if (!hasTrait(comp, "ln-el-font-size")) traitsHeading(comp);
    return;
  }
  if (tag === "p" || tag === "blockquote") {
    if (!hasTrait(comp, "ln-el-font-size")) traitsParagraph(comp);
    return;
  }
  if (tag === "li" || tag === "td" || tag === "th") {
    if (!hasTrait(comp, "ln-el-font-size")) traitsListItem(comp);
    return;
  }
  if (tag === "span" || tag === "small" || tag === "strong" || tag === "em" || tag === "label") {
    if (!hasTrait(comp, "ln-el-font-size")) traitsSpan(comp);
    return;
  }
  if (tag === "section") {
    traitsSection(comp);
    return;
  }
  if (tag === "video") {
    if (!hasTrait(comp, "ln-el-video-poster")) traitsVideo(comp);
    return;
  }
  if (tag === "iframe") {
    if (!hasTrait(comp, "ln-el-iframe-src")) traitsIframe(comp);
    return;
  }
}

function walkComponents(root: Component | null | undefined, visitor: (c: Component) => void): void {
  if (!root) return;
  visitor(root);
  const kids = root.components?.();
  kids?.forEach?.((ch: Component) => walkComponents(ch, visitor));
}

/**
 * Быстрые traits для элементов холста: у ссылок-кнопок и button (не вкладки) —
 * название, ссылка, «в новом окне», тип страница/блок/url, типографика и обводка,
 * скругление и три цвета при наведении (текст, фон, обводка).
 */
export function attachLemnityBoxElementQuickTraits(editor: Editor): () => void {
  const onFrame = () => injectHoverCss(editor);

  const runTree = (root: Component | null | undefined) => {
    walkComponents(root, ensureTraitsForComponent);
  };

  const onLoad = () => {
    onFrame();
    runTree(editor.getWrapper?.() ?? null);
  };

  const onAdd = (model: Component, opts?: { action?: string }) => {
    const act = opts?.action;
    if (act && act !== "add-component" && act !== "move-component" && act !== "clone-component") return;
    onFrame();
    walkComponents(model, ensureTraitsForComponent);
  };

  editor.on("load", onLoad);
  editor.on("component:add", onAdd);
  editor.on("canvas:frame:load:body", onFrame);

  queueMicrotask(onLoad);

  return () => {
    editor.off?.("load", onLoad);
    editor.off?.("component:add", onAdd);
    editor.off?.("canvas:frame:load:body", onFrame);
  };
}
