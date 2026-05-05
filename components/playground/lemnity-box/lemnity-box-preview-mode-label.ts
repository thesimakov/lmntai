import type { Editor } from "grapesjs";

const SYNC_KEY = "__lemnityPreviewModeLabelSync__" as const;

function findPreviewButtonEl(dock: HTMLElement): HTMLElement | null {
  const row = dock.querySelector(":scope > .gjs-pn-buttons");
  if (!row) return null;
  const btns = [...row.querySelectorAll<HTMLElement>(".gjs-pn-btn")];
  const byAria = btns.find((b) => /просмотр|preview/i.test(b.getAttribute("aria-label") ?? ""));
  if (byAria) return byAria;
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
    "display:inline-flex;align-items:center;gap:4px;flex-shrink:0;vertical-align:middle;margin-right:2px;";

  previewEl.parentElement.insertBefore(wrap, previewEl);
  wrap.appendChild(previewEl);

  const textBtn = document.createElement("button");
  textBtn.type = "button";
  textBtn.className = "lemnity-preview-mode-label-btn";
  textBtn.style.cssText =
    "font-size:12px;line-height:1.25;color:#64748b;background:transparent;border:none;cursor:pointer;padding:2px 4px 2px 0;white-space:nowrap;font-family:inherit;";
  wrap.appendChild(textBtn);

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

  const onRun = () => sync();
  const onStop = () => sync();
  editor.on("command:run:preview", onRun);
  editor.on("command:stop:preview", onStop);
  (editor as unknown as Record<string, () => void>)[SYNC_KEY] = sync;
  sync();
}

export function syncLemnityPreviewModeLabel(editor: Editor | null | undefined): void {
  if (!editor) return;
  const fn = (editor as unknown as Record<string, unknown>)[SYNC_KEY];
  if (typeof fn === "function") (fn as () => void)();
}
