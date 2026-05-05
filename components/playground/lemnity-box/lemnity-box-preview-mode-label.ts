import type { Editor } from "grapesjs";

const SYNC_KEY = "__lemnityPreviewModeLabelSync__" as const;

function findPreviewButtonEl(dock: HTMLElement): HTMLElement | null {
  const row = dock.querySelector(":scope > .gjs-pn-buttons");
  if (!row) return null;
  const btns = [...row.querySelectorAll<HTMLElement>(".gjs-pn-btn")];
  const byAria = btns.find((b) => /просмотр|preview/i.test(b.getAttribute("aria-label") ?? ""));
  if (byAria) return byAria;
  const byTitle = btns.find((b) => /просмотр|preview/i.test(b.getAttribute("title") ?? ""));
  if (byTitle) return byTitle;
  // В панели «options» второй элемент — предпросмотр (после outline).
  return btns[1] ?? null;
}

/**
 * Подпись рядом с иконкой предпросмотра: «Просмотр» в режиме редактора, «Редактировать» в превью;
 * клик по подписи переключает тот же режим, что и кнопка Grapes.
 */
export function attachLemnityBoxPreviewModeLabel(
  editor: Editor,
  dock: HTMLElement,
  getLabels: () => { idle: string; active: string },
): void {
  const previewEl = findPreviewButtonEl(dock);
  if (!previewEl?.parentElement || previewEl.closest(".lemnity-preview-with-label")) return;

  const wrap = document.createElement("span");
  wrap.className = "lemnity-preview-with-label";
  wrap.style.cssText =
    "display:inline-flex;align-items:center;gap:6px;flex-shrink:0;vertical-align:middle;margin-right:4px;";

  const textBtn = document.createElement("button");
  textBtn.type = "button";
  textBtn.className = "lemnity-preview-mode-label-btn";
  textBtn.style.cssText =
    "font-size:12px;line-height:1.25;font-weight:600;color:#334155;background:transparent;border:none;cursor:pointer;padding:2px 6px 2px 2px;white-space:nowrap;font-family:inherit;";

  previewEl.parentElement.insertBefore(wrap, previewEl);
  wrap.appendChild(textBtn);
  wrap.appendChild(previewEl);

  const sync = () => {
    let active = false;
    try {
      active = editor.Commands.isActive("preview");
    } catch {
      active = false;
    }
    const { idle, active: activeLabel } = getLabels();
    const next = active ? activeLabel : idle;
    textBtn.textContent = next;
    textBtn.setAttribute("aria-label", next);
  };

  const onTextClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (editor.Commands.isActive("preview")) editor.stopCommand("preview");
      else editor.runCommand("preview");
    } catch {
      /* noop */
    }
  };
  textBtn.addEventListener("click", onTextClick);

  editor.on("command:run:preview", sync);
  editor.on("command:stop:preview", sync);
  (editor as unknown as Record<string, () => void>)[SYNC_KEY] = sync;
  sync();
}

export function syncLemnityPreviewModeLabel(editor: Editor | null | undefined): void {
  if (!editor) return;
  const fn = (editor as unknown as Record<string, unknown>)[SYNC_KEY];
  if (typeof fn === "function") (fn as () => void)();
}
