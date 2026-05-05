import type { Component, Editor, TraitProperties } from "grapesjs";

import { LEMNITY_GRID_SECTION_BASE_TRAITS } from "@/components/playground/lemnity-box/lemnity-box-section-width-grid";

const FORM_TRAIT_NAME = "lemnity-form-settings";
const SHOP_FILTER_TRAIT_NAME = "lemnity-shop-filters";

type FieldKind = "text" | "email" | "tel" | "number" | "textarea";

/** Прямые потомки form: блоки полей без кнопки отправить */
function enumerateFormFieldRows(formEl: HTMLFormElement): HTMLElement[] {
  const rows: HTMLElement[] = [];
  for (const ch of [...formEl.children]) {
    if (!(ch instanceof HTMLElement)) continue;
    const primary = ch.querySelector<HTMLElement>("input.lf-inp, textarea.lf-ta");
    if (!primary) continue;
    if (primary instanceof HTMLInputElement) {
      if (primary.type === "checkbox" || primary.type === "radio" || primary.type === "hidden") continue;
    }
    if (ch.querySelector("button[type='submit'], .lf-btn")) continue;
    rows.push(ch);
  }
  return rows;
}

function fieldKindFrom(el: HTMLElement): FieldKind {
  if (el.tagName === "TEXTAREA") return "textarea";
  const inp = el as HTMLInputElement;
  const t = (inp.type ?? "text").toLowerCase();
  if (t === "email" || t === "tel" || t === "number" || t === "textarea") return t as FieldKind;
  return "text";
}

function setFieldKind(primary: HTMLElement, kind: FieldKind) {
  if (kind === "textarea") {
    if (primary.tagName === "TEXTAREA") {
      primary.classList.add("lf-inp", "lf-ta");
      return primary;
    }
    const inp = primary as HTMLInputElement;
    const ta = document.createElement("textarea");
    ta.className = "lf-inp lf-ta";
    ta.name = inp.name;
    ta.placeholder = inp.placeholder ?? "";
    if (!ta.textContent && inp.value) ta.value = inp.value;
    inp.replaceWith(ta);
    return ta;
  }

  let inputEl: HTMLInputElement;
  if (primary.tagName === "TEXTAREA") {
    const ta = primary as HTMLTextAreaElement;
    inputEl = document.createElement("input");
    inputEl.className = "lf-inp";
    inputEl.name = ta.name;
    inputEl.placeholder = ta.placeholder ?? "";
    inputEl.type = kind;
    primary.replaceWith(inputEl);
  } else {
    inputEl = primary as HTMLInputElement;
    inputEl.type = kind;
  }
  return inputEl;
}

function findNestedForm(sec: Component): Component | undefined {
  const list = typeof sec.find === "function" ? sec.find("form") : [];
  const first = Array.isArray(list)
    ? list[0]
    : (list as { length?: number; [key: number]: Component } | undefined)?.[0];
  return first;
}

function isFormSection(sec: Component): boolean {
  const el = sec.getEl?.();
  return Boolean(el instanceof HTMLElement && el.classList.contains("lemnity-form-s"));
}

function isShopFiltersSection(sec: Component): boolean {
  const el = sec.getEl?.();
  return Boolean(
    el instanceof HTMLElement &&
      el.classList.contains("lemnity-shop-s") &&
      el.querySelector(".lemnity-filter-layout .lemnity-filter-aside"),
  );
}

function traitsWithoutBlockSettings(sec: Component): TraitProperties[] {
  if (typeof sec.getTraits !== "function") return [];
  return sec
    .getTraits()
    .map((tr) => ({ ...(tr.props() as TraitProperties) }))
    .filter((t) => {
      const key = String(t.name ?? t.id ?? "");
      return key !== FORM_TRAIT_NAME && key !== SHOP_FILTER_TRAIT_NAME;
    });
}

function mergeTraitsForSection(editor: Editor, sec: Component) {
  void editor;
  if (String(sec.get?.("tagName") ?? "").toLowerCase() !== "section") return;

  const gridBase: TraitProperties[] = LEMNITY_GRID_SECTION_BASE_TRAITS.map((t) => ({ ...t }));

  const inherited = traitsWithoutBlockSettings(sec).filter((t) => {
    const key = String(t.name ?? t.id ?? "");
    return (
      key.length > 0 &&
      key !== "data-ln-span" &&
      key !== "data-ln-align" &&
      key !== FORM_TRAIT_NAME &&
      key !== SHOP_FILTER_TRAIT_NAME
    );
  });

  const extra: TraitProperties[] = [];

  const wantForm = isFormSection(sec) && findNestedForm(sec) !== undefined;
  const wantFilters = isShopFiltersSection(sec);

  if (wantForm)
    extra.push({
      type: FORM_TRAIT_NAME,
      name: FORM_TRAIT_NAME,
      label: "Форма: поля и типы",
    });
  if (wantFilters)
    extra.push({
      type: SHOP_FILTER_TRAIT_NAME,
      name: SHOP_FILTER_TRAIT_NAME,
      label: "Магазин: блоки фильтра",
    });

  sec.setTraits([...gridBase, ...inherited, ...extra]);
}

function registerFormSettingsTrait(editor: Editor) {
  editor.TraitManager.addType(FORM_TRAIT_NAME, {
    createInput({ component }: { component: Component }) {
      const root = document.createElement("div");
      root.className = "lemnity-block-settings lemnity-block-settings--form";

      const note = document.createElement("p");
      note.className = "lemnity-block-settings-hint";
      note.textContent = "Для каждой строки — подпись, имя поля (name) и тип данных.";

      const actionsTop = document.createElement("div");
      actionsTop.className = "lemnity-block-settings-row";

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "lemnity-block-settings-btn";
      addBtn.textContent = "Добавить поле";

      actionsTop.appendChild(addBtn);

      const list = document.createElement("div");
      list.className = "lemnity-block-settings-list";

      root.appendChild(note);
      root.appendChild(actionsTop);
      root.appendChild(list);

      const uniq = () => `f_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;

      function render() {
        list.replaceChildren();
        const formComp = findNestedForm(component);
        const formEl = formComp?.getEl?.();
        if (!formEl || !(formEl instanceof HTMLFormElement)) {
          const err = document.createElement("p");
          err.className = "lemnity-block-settings-muted";
          err.textContent = "В этом блоке нет тега «form». Вставьте шаблон формы из библиотеки блоков.";
          list.appendChild(err);
          return;
        }

        const rows = enumerateFormFieldRows(formEl);
        rows.forEach((rowEl) => {
          const primary = rowEl.querySelector("input.lf-inp, textarea.lf-ta") as HTMLElement | null;
          if (!primary) return;

          const lab = rowEl.querySelector(".lf-lab");

          const rowWrap = document.createElement("div");
          rowWrap.className = "lemnity-block-settings-field";

          const kindSel = document.createElement("select");
          kindSel.className = "lemnity-block-settings-select";
          (["text", "email", "tel", "number", "textarea"] as FieldKind[]).forEach((k) => {
            const opt = document.createElement("option");
            opt.value = k;
            opt.textContent =
              k === "text"
                ? "Текст"
                : k === "email"
                  ? "Электропочта"
                  : k === "tel"
                    ? "Телефон"
                    : k === "number"
                      ? "Число"
                      : "Многострочный текст";
            kindSel.appendChild(opt);
          });
          kindSel.value = fieldKindFrom(primary);

          const labelInp = document.createElement("input");
          labelInp.type = "text";
          labelInp.className = "lemnity-block-settings-text";
          labelInp.placeholder = "Подпись";
          labelInp.value = lab?.textContent?.trim() ?? "";

          const nameInp = document.createElement("input");
          nameInp.type = "text";
          nameInp.className = "lemnity-block-settings-text";
          nameInp.placeholder = "name";
          nameInp.value =
            primary instanceof HTMLTextAreaElement ? primary.name : (primary as HTMLInputElement).name ?? "";

          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "lemnity-block-settings-btn lemnity-block-settings-btn--ghost";
          removeBtn.textContent = "Удалить";

          const onSync = () => {
            editor.refresh();
          };

          kindSel.addEventListener("change", () => {
            const next = kindSel.value as FieldKind;
            setFieldKind(primary, next);
            onSync();
            render();
          });

          labelInp.addEventListener("change", () => {
            if (lab instanceof HTMLElement) lab.textContent = labelInp.value || "Подпись";
            onSync();
          });

          nameInp.addEventListener("change", () => {
            if (primary instanceof HTMLTextAreaElement) primary.name = nameInp.value.trim();
            else (primary as HTMLInputElement).name = nameInp.value.trim();
            onSync();
          });

          removeBtn.addEventListener("click", () => {
            rowEl.remove();
            editor.refresh();
            render();
          });

          rowWrap.appendChild(kindSel);
          rowWrap.appendChild(labelInp);
          rowWrap.appendChild(nameInp);
          rowWrap.appendChild(removeBtn);
          list.appendChild(rowWrap);
        });
      }

      addBtn.addEventListener("click", () => {
        const formComp = findNestedForm(component);
        const formEl = formComp?.getEl?.();
        if (!formComp || !(formEl instanceof HTMLFormElement)) return;
        const id = uniq();
        const html = `<div style="margin-top:14px"><span class="lf-lab">Новое поле</span><input class="lf-inp" type="text" name="${id}" placeholder=""/></div>`;
        formComp.append(html);
        editor.refresh();
        render();
      });

      render();

      return root;
    },
  });
}

function registerShopFilterTrait(editor: Editor) {
  editor.TraitManager.addType(SHOP_FILTER_TRAIT_NAME, {
    createInput({ component }: { component: Component }) {
      const root = document.createElement("div");
      root.className = "lemnity-block-settings lemnity-block-settings--shop";

      const hint = document.createElement("p");
      hint.className = "lemnity-block-settings-hint";
      hint.textContent = "Раздел фильтра — группа заголовков, ссылок и чекбоксов слева в каталоге.";

      const btnRow = document.createElement("div");
      btnRow.className = "lemnity-block-settings-row";

      const add = document.createElement("button");
      add.type = "button";
      add.className = "lemnity-block-settings-btn";
      add.textContent = "Добавить раздел фильтра";

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "lemnity-block-settings-btn lemnity-block-settings-btn--danger";
      removeBtn.textContent = "Удалить последний раздел";

      btnRow.appendChild(add);
      btnRow.appendChild(removeBtn);
      root.appendChild(hint);
      root.appendChild(btnRow);

      add.addEventListener("click", () => {
        const el = component.getEl?.();
        if (!(el instanceof HTMLElement)) return;
        const aside = el.querySelector<HTMLElement>("aside.lemnity-filter-aside");
        if (!aside) return;
        const blockHtml =
          `<div data-ln-filter-block style="margin-top:14px;padding-top:10px;border-top:1px solid #e5e7eb;">` +
          `<p style="margin:0 0 8px;font-weight:700;color:#374151;font-size:12px;text-transform:none;">Новый раздел</p>` +
          `<a href="#" style="display:block;padding:6px 0;color:#64748b;text-decoration:none;font-size:12px;">Пункт 1</a>` +
          `<label style="display:flex;gap:8px;margin:8px 0;align-items:center;font-size:12px;color:#475569;"><input type="checkbox"/> Вариант A</label>` +
          `</div>`;
        aside.insertAdjacentHTML("beforeend", blockHtml);
        editor.refresh();
      });

      removeBtn.addEventListener("click", () => {
        const el = component.getEl?.();
        if (!(el instanceof HTMLElement)) return;
        const aside = el.querySelector<HTMLElement>("aside.lemnity-filter-aside");
        if (!aside) return;
        const nodes = [...aside.querySelectorAll("[data-ln-filter-block]")];
        const last = nodes[nodes.length - 1];
        last?.remove();
        editor.refresh();
      });

      return root;
    },
  });
}

function walkSections(sec: Component | null | undefined, fn: (c: Component) => void) {
  if (!sec?.get) return;
  const tag = String(sec.get("tagName") ?? "").toUpperCase();
  if (tag === "SECTION") fn(sec);
  const kids = sec.components?.();
  if (!kids?.forEach) return;
  kids.forEach((ch: Component) => walkSections(ch, fn));
}

/**
 * Расширяет вкладку «Настройки»: поля форм и блоки фильтра каталога.
 */
export function attachLemnityBoxBlockSettings(editor: Editor): () => void {
  registerFormSettingsTrait(editor);
  registerShopFilterTrait(editor);

  const ping = () => {
    queueMicrotask(() => {
      const wrap = typeof editor.getWrapper === "function" ? editor.getWrapper() : undefined;
      if (!wrap) return;
      walkSections(wrap, (c) => mergeTraitsForSection(editor, c));
    });
  };

  const onAdd = (_m: Component, opts?: { action?: string }) => {
    if (opts?.action && opts.action !== "add-component") return;
    ping();
  };

  editor.on("load", ping);
  editor.on("component:add", onAdd);

  ping();

  return () => {
    editor.off("load", ping);
    editor.off("component:add", onAdd);
  };
}
