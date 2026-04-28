/** Плавающие подписи поверх превью в iframe (pointer-events: none). */

export const LEMNITY_OVERLAY_ROOT_ID = "lemnity-visual-overlay-root";

const OVERLAY_STYLE_ID = "lemnity-visual-overlay-style";

export function ensureOverlayStyles(doc: Document): void {
  if (doc.getElementById(OVERLAY_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = OVERLAY_STYLE_ID;
  style.textContent = `
    #${LEMNITY_OVERLAY_ROOT_ID} {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483000;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
    /* Родитель с none не отключает события у дочерних узлов — без этого чипы блокируют клики по странице. */
    #${LEMNITY_OVERLAY_ROOT_ID} .lemnity-overlay-chip,
    #${LEMNITY_OVERLAY_ROOT_ID} .lemnity-overlay-chip * {
      pointer-events: none;
    }
    #${LEMNITY_OVERLAY_ROOT_ID} .lemnity-overlay-chip {
      position: absolute;
      left: 0;
      top: 0;
      max-width: min(280px, 90vw);
      padding: 2px 8px 3px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.35;
      letter-spacing: 0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 1px 3px rgba(0,0,0,.18);
    }
    #${LEMNITY_OVERLAY_ROOT_ID} .lemnity-overlay-chip--hover {
      background: rgba(147, 51, 234, 0.95);
      color: #fff;
      outline: 2px solid rgba(147, 51, 234, 1);
    }
    #${LEMNITY_OVERLAY_ROOT_ID} .lemnity-overlay-chip--selected {
      background: #6C4EFF;
      color: #fff;
      outline: 3px solid #6C4EFF;
    }
    #${LEMNITY_OVERLAY_ROOT_ID} .lemnity-overlay-chip-sub {
      display: block;
      font-weight: 500;
      opacity: 0.92;
      font-size: 10px;
      margin-top: 1px;
    }
  `;
  doc.head?.appendChild(style);
}

export function ensureOverlayRoot(doc: Document): HTMLElement {
  ensureOverlayStyles(doc);
  let root = doc.getElementById(LEMNITY_OVERLAY_ROOT_ID) as HTMLElement | null;
  if (root) return root;
  root = doc.createElement("div");
  root.id = LEMNITY_OVERLAY_ROOT_ID;
  doc.body?.appendChild(root);
  return root;
}

export function removeOverlayRoot(doc: Document): void {
  doc.getElementById(LEMNITY_OVERLAY_ROOT_ID)?.remove();
  doc.getElementById(OVERLAY_STYLE_ID)?.remove();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type ChipVariant = "hover" | "selected";

function placeChip(
  chip: HTMLElement,
  variant: ChipVariant,
  target: Element,
  primary: string,
  secondary: string
): void {
  chip.className =
    variant === "hover" ? "lemnity-overlay-chip lemnity-overlay-chip--hover" : "lemnity-overlay-chip lemnity-overlay-chip--selected";
  chip.innerHTML = secondary
    ? `<span>${escapeHtml(primary)}</span><span class="lemnity-overlay-chip-sub">${escapeHtml(secondary)}</span>`
    : `<span>${escapeHtml(primary)}</span>`;
  const rect = target.getBoundingClientRect();
  const margin = 4;
  const estH = secondary ? 38 : 22;
  let top = rect.top - estH - margin;
  if (top < margin) top = rect.bottom + margin;
  chip.style.left = `${Math.max(margin, rect.left)}px`;
  chip.style.top = `${top}px`;
}

export function createOverlayController(doc: Document): {
  setHover: (target: Element | null, lineA: string, lineB: string) => void;
  setSelected: (target: Element | null, lineA: string, lineB: string) => void;
  refresh: () => void;
  destroy: () => void;
} {
  const root = ensureOverlayRoot(doc);
  let hoverEl: Element | null = null;
  let selectedEl: Element | null = null;
  let hoverPrimary = "";
  let hoverSecondary = "";
  let selPrimary = "";
  let selSecondary = "";

  const hoverChip = doc.createElement("div");
  const selectedChip = doc.createElement("div");
  root.appendChild(hoverChip);
  root.appendChild(selectedChip);

  function layout(): void {
    if (hoverEl?.isConnected && hoverEl !== selectedEl) {
      placeChip(hoverChip, "hover", hoverEl, hoverPrimary, hoverSecondary);
    } else {
      hoverChip.style.left = "-9999px";
    }
    if (selectedEl?.isConnected) {
      placeChip(selectedChip, "selected", selectedEl, selPrimary, selSecondary);
    } else {
      selectedChip.style.left = "-9999px";
    }
  }

  function setHover(target: Element | null, lineA: string, lineB: string): void {
    hoverEl = target && target !== selectedEl ? target : null;
    hoverPrimary = lineA;
    hoverSecondary = lineB;
    layout();
  }

  function setSelected(target: Element | null, lineA: string, lineB: string): void {
    selectedEl = target;
    selPrimary = lineA;
    selSecondary = lineB;
    if (target && hoverEl === target) hoverEl = null;
    layout();
  }

  function onScrollOrResize(): void {
    layout();
  }

  doc.defaultView?.addEventListener("scroll", onScrollOrResize, true);
  doc.defaultView?.addEventListener("resize", onScrollOrResize);

  return {
    setHover,
    setSelected,
    refresh: layout,
    destroy: () => {
      doc.defaultView?.removeEventListener("scroll", onScrollOrResize, true);
      doc.defaultView?.removeEventListener("resize", onScrollOrResize);
      hoverChip.remove();
      selectedChip.remove();
    }
  };
}
