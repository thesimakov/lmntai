/**
 * Стили появления секций Lemnity Box (холст + экспорт страницы).
 * Подключайте через init CSS редактора и при необходимости — инжект в iframe.
 */
export const LEMNITY_BOX_SECTION_MOTION_STYLE_ID = "lemnity-box-section-motion-styles";

export const LEMNITY_BOX_SECTION_MOTION_CSS = `
@keyframes lemnity-section-rise {
  from {
    opacity: 0;
    transform: translate3d(0, 20px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes lemnity-section-loading {
  0% {
    opacity: 0.35;
    filter: saturate(0.25) brightness(1.06);
    transform: scale(0.996);
  }
  65% {
    opacity: 0.88;
    filter: saturate(0.85) brightness(1.02);
    transform: scale(1);
  }
  100% {
    opacity: 1;
    filter: none;
    transform: scale(1);
  }
}

.lemnity-section {
  position: relative;
  overflow-anchor: none;
  animation:
    lemnity-section-loading 0.52s cubic-bezier(0.4, 0, 0.2, 1) both,
    lemnity-section-rise 0.68s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
}

@media (prefers-reduced-motion: reduce) {
  .lemnity-section {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }
}
`.trim();

export function injectLemnityBoxSectionMotionIntoCanvas(win: Window | null | undefined): void {
  const doc = win?.document;
  if (!doc?.head) return;
  if (doc.getElementById(LEMNITY_BOX_SECTION_MOTION_STYLE_ID)) return;
  const el = doc.createElement("style");
  el.id = LEMNITY_BOX_SECTION_MOTION_STYLE_ID;
  el.textContent = LEMNITY_BOX_SECTION_MOTION_CSS;
  doc.head.appendChild(el);
}

/** Если в сохранённом CSS ещё нет правил появления — дописать (старые черновики). */
export function mergeLemnityBoxSectionMotionCss(css: string): string {
  if (css.includes("lemnity-section-rise")) return css;
  const trimmed = css.trimEnd();
  return trimmed.length === 0 ? LEMNITY_BOX_SECTION_MOTION_CSS : `${trimmed}\n\n${LEMNITY_BOX_SECTION_MOTION_CSS}`;
}
