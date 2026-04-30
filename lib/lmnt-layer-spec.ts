/**
 * Слои макета для визредатора: стабильные z-index-блоки и явные секции DOM,
 * чтобы стрелки перемещали контейнеры предсказуемо среди братьев.
 */

export const LMNT_LAYER_ATTR = "data-lmnt-layer";

export const LMNT_LAYOUT_ROOT_ATTR = "data-lmnt-layout-root";

/** Короткие русские строки для вставки в buildTemplate RULES. */
export const LMNT_LAYER_RULES_BLOCK_RU = `
- **СЛОИ (визуальный редактор — перемещение блоков стрелками):** каждую крупную зону страницы оборачивай в свой контейнер с атрибутом ${LMNT_LAYER_ATTR}="<tier>" на элементе верхнего уровня этой зоны (${LMNT_LAYER_ATTR}="nav" для фикс/липкой шапки и подвала при необходимости, "base" — обычные секции основного контента, "raised" — карточки/виджеты над фоном, "floating" — плавающие элементы, "overlay" — модальные области). Один корневой узел приложения после монтирования (например внешний div в App.tsx) желательно пометить ${LMNT_LAYOUT_ROOT_ATTR}: встроенный CSS выставляет isolation/z-index-слои. Новые секции по логическим блокам — отдельные обёртки <section>, а не один плоский div на всё.`;

/** Англоязычные инструкции для Router-проекта (buildRouterGenerationPrompt). */
export const LMNT_LAYER_RULES_LINES_EN: string[] = [
  "**Layout layers (visual editor):** Wrap each major viewport band — sticky nav, hero band, alternating content sections, card grids, footer — in its own `<section>` or `<div>` with the attribute `data-lmnt-layer=\"<tier>\"` where tier is one of: `base` (default flow), `raised` (cards/widgets over background), `nav` (header/footer bars), `floating` (fixed CTAs), `overlay` (modal-like blocks only when needed).",
  "Apply `data-lmnt-layout-root` **once** on the top-level wrapper inside `#root` (e.g. the outer `<div>` of `App`) so stacking contexts behave consistently.",
  "Keep siblings at the section level where possible — the editor moves elements among DOM siblings inside the same parent."
];

/**
 * Инжектируется вместе с режимом визреда iframe: не ломает стили без атрибутов.
 */
export function lmntLayerBaseCssSnippet(): string {
  return `
    [${LMNT_LAYOUT_ROOT_ATTR}] {
      position: relative;
      isolation: isolate;
    }
    [${LMNT_LAYER_ATTR}="base"] {
      position: relative;
      z-index: 0;
      isolation: isolate;
    }
    [${LMNT_LAYER_ATTR}="raised"] {
      position: relative;
      z-index: 10;
      isolation: isolate;
    }
    [${LMNT_LAYER_ATTR}="floating"] {
      position: relative;
      z-index: 20;
      isolation: isolate;
    }
    [${LMNT_LAYER_ATTR}="nav"] {
      position: relative;
      z-index: 50;
      isolation: isolate;
    }
    [${LMNT_LAYER_ATTR}="overlay"] {
      position: relative;
      z-index: 100;
      isolation: isolate;
    }
  `.trim();
}

/** Один раз на документ iframe: базовые z-index-слои для data-lmnt-*. */
export function ensureLmntLayerStylesInDocument(doc: Document): void {
  const id = "lemnity-lmnt-layer-base-styles";
  if (doc.getElementById(id)) return;
  const s = doc.createElement("style");
  s.id = id;
  s.textContent = lmntLayerBaseCssSnippet();
  doc.head?.appendChild(s);
}
