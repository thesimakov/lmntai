/** Плавающие подписи поверх превью в iframe (pointer-events: none), панель перемещения — с pointer-events. */

export const LEMNITY_OVERLAY_ROOT_ID = "lemnity-visual-overlay-root";

const OVERLAY_STYLE_ID = "lemnity-visual-overlay-style";

/** Направления кнопок на оверлее выделения контейнера (↑↓ переставляют среди братьев, ←→ — «вокруг» родителя). */
export type MoveToolbarDirection = "up" | "down" | "left" | "right";

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
    #${LEMNITY_OVERLAY_ROOT_ID} .lemnity-overlay-move-toolbar {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 3px;
      padding: 3px;
      border-radius: 8px;
      background: rgba(15, 15, 20, 0.92);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 2px 10px rgba(0,0,0,.35);
      pointer-events: auto;
    }
    #${LEMNITY_OVERLAY_ROOT_ID} .lemnity-overlay-move-toolbar button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 0;
      width: 24px;
      height: 24px;
      font-size: 13px;
      line-height: 1;
      border-radius: 5px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.08);
      color: #fafafa;
      cursor: pointer;
    }
    #${LEMNITY_OVERLAY_ROOT_ID} .lemnity-overlay-move-toolbar button:hover:not(:disabled) {
      background: rgba(124, 92, 255, 0.85);
      border-color: rgba(255,255,255,0.28);
      color: #fff;
    }
    #${LEMNITY_OVERLAY_ROOT_ID} .lemnity-overlay-move-toolbar button:disabled {
      opacity: 0.35;
      cursor: default;
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

/** Порядок кнопок: выше, ниже, влево, вправо. */
const MOVE_ORDER: MoveToolbarDirection[] = ["up", "down", "left", "right"];

function arrowGlyph(d: MoveToolbarDirection): string {
  switch (d) {
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "left":
      return "←";
    case "right":
      return "→";
    default:
      return "·";
  }
}

function placeMoveToolbar(bar: HTMLElement, target: Element, doc: Document): void {
  bar.style.visibility = "visible";
  const rect = target.getBoundingClientRect();
  const margin = 6;
  const win = doc.defaultView;
  const vw = win?.innerWidth ?? 800;
  const tw = Math.max(bar.offsetWidth, 108);
  const th = Math.max(bar.offsetHeight, 29);
  let top = rect.top - th - margin;
  if (top < margin) top = rect.bottom + margin;
  let left = rect.right - tw - margin;
  const maxLeft = Math.max(margin, vw - tw - margin);
  if (left < margin) left = margin;
  if (left > maxLeft) left = maxLeft;
  bar.style.top = `${top}px`;
  bar.style.left = `${left}px`;
}

type MoveToolbarLabels = { up: string; down: string; left: string; right: string };

export function createOverlayController(
  doc: Document,
  options?: {
    onMoveDirection?: (d: MoveToolbarDirection) => void;
  }
): {
  setHover: (target: Element | null, lineA: string, lineB: string) => void;
  setSelected: (
    target: Element | null,
    lineA: string,
    lineB: string,
    showMoveToolbar?: boolean,
    moveLabels?: MoveToolbarLabels | null
  ) => void;
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
  let selShowMoveToolbar = false;
  let selMoveLabels: MoveToolbarLabels | null = null;

  const hoverChip = doc.createElement("div");
  const selectedChip = doc.createElement("div");
  const toolbar = doc.createElement("div");
  toolbar.className = "lemnity-overlay-move-toolbar";
  toolbar.setAttribute("data-lmnt-move-toolbar", "1");
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Reorder layout element");

  const moveButtons = new Map<MoveToolbarDirection, HTMLButtonElement>();
  for (const dir of MOVE_ORDER) {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-dir", dir);
    btn.innerHTML = "";
    btn.textContent = arrowGlyph(dir);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      options?.onMoveDirection?.(dir);
    });
    toolbar.appendChild(btn);
    moveButtons.set(dir, btn);
  }
  toolbar.addEventListener(
    "pointerdown",
    (ev) => {
      ev.stopPropagation();
    },
    true
  );

  root.appendChild(hoverChip);
  root.appendChild(selectedChip);
  root.appendChild(toolbar);

  function refreshMoveAria(): void {
    const lbl = selMoveLabels;
    for (const dir of MOVE_ORDER) {
      const b = moveButtons.get(dir);
      if (!b) continue;
      const t = lbl ? lbl[dir] : "";
      b.title = t;
      b.setAttribute("aria-label", t || dir);
    }
  }

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

    const canMove =
      Boolean(options?.onMoveDirection) && selShowMoveToolbar && selectedEl?.isConnected === true;
    if (canMove && selectedEl) {
      refreshMoveAria();
      placeMoveToolbar(toolbar, selectedEl, doc);
    } else {
      toolbar.style.visibility = "hidden";
      toolbar.style.left = "-9999px";
    }
  }

  function setHover(target: Element | null, lineA: string, lineB: string): void {
    hoverEl = target && target !== selectedEl ? target : null;
    hoverPrimary = lineA;
    hoverSecondary = lineB;
    layout();
  }

  function setSelected(
    target: Element | null,
    lineA: string,
    lineB: string,
    showMoveToolbar = false,
    moveLabels?: MoveToolbarLabels | null
  ): void {
    selectedEl = target;
    selPrimary = lineA;
    selSecondary = lineB;
    selShowMoveToolbar = showMoveToolbar && Boolean(options?.onMoveDirection);
    selMoveLabels = moveLabels ?? null;
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
      toolbar.remove();
    }
  };
}
