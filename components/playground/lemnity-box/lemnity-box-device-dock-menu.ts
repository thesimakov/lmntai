import type { Editor } from "grapesjs";

type DeviceLike = { get: (k: string) => unknown };

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || "") || navigator.userAgent.includes("Mac");
}

function escapeAttr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function deviceRowLabel(editor: Editor, id: string, fallback: string): string {
  if (typeof editor.t === "function") {
    const tr = editor.t(`deviceManager.devices.${id}` as Parameters<typeof editor.t>[0]);
    if (typeof tr === "string" && tr.length > 0 && !tr.startsWith("deviceManager.")) {
      return tr;
    }
  }
  return fallback;
}

function formatWidthBadge(width: unknown): string {
  if (width == null) return "100%";
  const s = String(width).trim();
  if (!s) return "100%";
  return s.replace(/\s+/g, "");
}

const ICON_PHONE_PORT = `<svg class="playground-box-device-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="2" width="8" height="20" rx="2" ry="2"/><path d="M11 19h2"/></svg>`;

const ICON_PHONE_LAND = `<svg class="playground-box-device-icon-svg playground-box-device-icon-svg--land" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="8" width="20" height="8" rx="2" ry="2"/><path d="M19 11v2"/></svg>`;

const ICON_TABLET_PORT = `<svg class="playground-box-device-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`;

const ICON_DESKTOP = `<svg class="playground-box-device-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="4" width="20" height="13" rx="1.5" ry="1.5"/><path d="M8 21h8M12 17v4"/></svg>`;

function iconHtmlForDeviceId(id: string): string {
  switch (id) {
    case "mobilePortrait":
      return ICON_PHONE_PORT;
    case "mobileLandscape":
      return ICON_PHONE_LAND;
    case "tablet":
      return ICON_TABLET_PORT;
    case "desktop":
      return ICON_DESKTOP;
    default:
      return ICON_DESKTOP;
  }
}

const PREFERRED_ORDER = ["mobilePortrait", "mobileLandscape", "tablet", "desktop"];

/**
 * Заменяет перенесённый в шапку `<select>` на кнопку с иконкой и всплывающим меню (как в макете).
 */
export function mountPlaygroundBoxDeviceMenu(dock: HTMLElement, editor: Editor, editorMount: Element): () => void {
  const ed = editor as Editor & {
    Devices?: {
      getDevices: () => DeviceLike[];
      getSelected: () => { get: (k: string) => unknown } | null | undefined;
      select: (id: string) => void;
    };
  };
  const dm = ed.Devices;
  if (!dm) {
    editorMount.querySelector<HTMLElement>(".gjs-pn-devices-c .gjs-devices-c")?.style.setProperty("display", "none");
    return () => {};
  }

  dock.querySelector("select.gjs-devices")?.remove();
  dock.replaceChildren();

  const allDevices = dm.getDevices() as unknown as DeviceLike[];
  const byId = new Map<string, DeviceLike>();
  for (const d of allDevices) {
    const id = String(d.get("id") ?? "");
    if (id) byId.set(id, d);
  }

  const orderedIds = [
    ...PREFERRED_ORDER.filter((id) => byId.has(id)),
    ...[...byId.keys()].filter((id) => !PREFERRED_ORDER.includes(id)),
  ];

  const modKey = isApplePlatform() ? "⌘" : "Ctrl";

  const root = document.createElement("div");
  root.className = "playground-box-device-menu";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "playground-box-device-trigger";
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");

  const triggerInner = document.createElement("span");
  triggerInner.className = "playground-box-device-trigger-inner";

  const chevron = document.createElement("span");
  chevron.className = "playground-box-device-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;

  const iconWrap = document.createElement("span");
  iconWrap.className = "playground-box-device-trigger-icon-wrap";
  const iconEl = document.createElement("span");
  iconEl.className = "playground-box-device-trigger-icon";
  iconEl.setAttribute("aria-hidden", "true");
  iconWrap.appendChild(iconEl);

  triggerInner.append(chevron, iconWrap);
  trigger.appendChild(triggerInner);

  const popover = document.createElement("div");
  popover.className = "playground-box-device-popover";
  popover.setAttribute("role", "menu");
  popover.hidden = true;

  const rowEls = new Map<string, HTMLButtonElement>();

  orderedIds.forEach((deviceId, index) => {
    const dev = byId.get(deviceId);
    if (!dev) return;

    const row = document.createElement("button");
    row.type = "button";
    row.className = "playground-box-device-row";
    row.setAttribute("role", "menuitem");
    row.dataset.deviceId = deviceId;

    const rowIcon = document.createElement("span");
    rowIcon.className = "playground-box-device-row-icon";
    rowIcon.innerHTML = iconHtmlForDeviceId(deviceId);

    const rowText = document.createElement("span");
    rowText.className = "playground-box-device-row-text";

    const rowLabel = document.createElement("span");
    rowLabel.className = "playground-box-device-row-label";
    const fallbackName = String(dev.get("name") ?? deviceId);
    rowLabel.textContent = deviceRowLabel(editor, deviceId, fallbackName);

    const rowDim = document.createElement("span");
    rowDim.className = "playground-box-device-row-dim";
    rowDim.textContent = formatWidthBadge(dev.get("width"));

    rowText.append(rowLabel, rowDim);

    const kbdWrap = document.createElement("span");
    kbdWrap.className = "playground-box-device-kbd-wrap";
    const slot = index + 1;
    if (slot <= 4) {
      kbdWrap.innerHTML = `<kbd class="playground-box-device-kbd">${escapeAttr(modKey)}</kbd><kbd class="playground-box-device-kbd">${slot}</kbd>`;
    }

    row.append(rowIcon, rowText, kbdWrap);
    row.addEventListener("click", () => {
      dm.select(deviceId);
      setOpen(false);
    });
    popover.appendChild(row);
    rowEls.set(deviceId, row);
  });

  root.append(trigger, popover);
  dock.appendChild(root);

  let open = false;

  const syncTriggerIcon = () => {
    const id = String(dm.getSelected()?.get?.("id") ?? orderedIds[0] ?? "desktop");
    iconEl.innerHTML = iconHtmlForDeviceId(id);
    trigger.setAttribute("aria-label", deviceRowLabel(editor, id, id));
  };

  const syncActiveRow = () => {
    const id = String(dm.getSelected()?.get?.("id") ?? "");
    rowEls.forEach((el, did) => {
      el.classList.toggle("playground-box-device-row--active", did === id);
    });
  };

  const setOpen = (next: boolean) => {
    open = next;
    popover.hidden = !next;
    trigger.setAttribute("aria-expanded", next ? "true" : "false");
    root.classList.toggle("playground-box-device-menu--open", next);
  };

  const onDeviceSelect = () => {
    syncTriggerIcon();
    syncActiveRow();
  };

  const onDocMouseDown = (ev: MouseEvent) => {
    if (!open) return;
    const t = ev.target as Node;
    if (root.contains(t)) return;
    setOpen(false);
  };

  const onKeyDown = (ev: KeyboardEvent) => {
    if (!open && (ev.metaKey || ev.ctrlKey) && !ev.altKey) {
      const n = Number(ev.key);
      if (n >= 1 && n <= 4 && orderedIds[n - 1]) {
        ev.preventDefault();
        dm.select(orderedIds[n - 1]);
        return;
      }
    }
    if (!open) return;
    if (ev.key === "Escape") {
      ev.preventDefault();
      setOpen(false);
      trigger.focus();
    }
  };

  trigger.addEventListener("click", () => {
    setOpen(!open);
    if (open) {
      const cur = String(dm.getSelected()?.get?.("id") ?? "");
      rowEls.get(cur)?.focus();
    }
  });

  document.addEventListener("mousedown", onDocMouseDown);
  window.addEventListener("keydown", onKeyDown);
  editor.on("device:select", onDeviceSelect);

  onDeviceSelect();
  editorMount.querySelector<HTMLElement>(".gjs-pn-devices-c .gjs-devices-c")?.style.setProperty("display", "none");

  return () => {
    document.removeEventListener("mousedown", onDocMouseDown);
    window.removeEventListener("keydown", onKeyDown);
    editor.off("device:select", onDeviceSelect);
    dock.replaceChildren();
  };
}
