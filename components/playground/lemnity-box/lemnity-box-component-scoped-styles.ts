import type { Component, Editor } from "grapesjs";

/**
 * GrapesJS по умолчанию может записывать правила вида `.общий-класс { height: … }`.
 * В импортированных шаблонах одинаковые utility-классы (Tailwind `.jos`, bootstrap-секции и т.д.)
 * повторяются у многих элементов — тогда правило меняет высоту у всех сразу.
 *
 * Добавляем на каждый узел уникальный класс `lmn-<id>` (или пере-создаём при клонировании),
 * чтобы селектор стилей становился составным и затрагивал только выбранный блок.
 */

function shortSid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }
  return `x${Math.random().toString(36).slice(2, 12)}`;
}

function readClasses(comp: Component): string[] {
  const cls = comp.getClasses?.();
  if (Array.isArray(cls)) return cls.map(String);
  if (typeof cls === "string") return cls.split(/\s+/).filter(Boolean);
  return [];
}

function stripLmnScopedClasses(comp: Component) {
  const strings = readClasses(comp);
  const removable = strings.filter((c) => c.startsWith("lmn-"));
  if (!removable.length) return;
  const rm = comp.removeClass?.bind(comp) as ((name: string, opts?: unknown) => void) | undefined;
  if (typeof rm === "function") {
    removable.forEach((c) => rm(c));
    return;
  }
  const next = strings.filter((c) => !c.startsWith("lmn-"));
  (comp as unknown as { setClass?: (v: string[]) => void }).setClass?.(next);
}

function walkComponents(root: Component | null | undefined, visitor: (c: Component) => void) {
  if (!root) return;
  visitor(root);
  const kids = root.components?.();
  kids?.forEach((ch: Component) => walkComponents(ch, visitor));
}

function shouldAttach(comp: Component, wrapper: Component | null): boolean {
  if (!wrapper || comp === wrapper) return false;
  if (comp.get?.("type") === "wrapper") return false;
  const tag = String(comp.get?.("tagName") ?? "").toLowerCase();
  if (!tag) return false;
  if (["style", "script", "link", "meta", "title", "noscript", "base"].includes(tag)) return false;
  return true;
}

function ensureScoped(comp: Component, wrapper: Component | null, regenerate: boolean) {
  if (!shouldAttach(comp, wrapper)) return;
  if (regenerate) stripLmnScopedClasses(comp);
  const cls = readClasses(comp);
  if (!regenerate && cls.some((c) => c.startsWith("lmn-"))) return;
  comp.addClass?.(`lmn-${shortSid()}`);
}

export function attachLemnityBoxComponentScopedStyles(editor: Editor): () => void {
  const getWrap = () => editor.getWrapper?.() ?? null;

  const onComponentAdd = (model: Component, opts?: { action?: string }) => {
    const wrap = getWrap();
    const act = opts?.action;
    if (act === "clone-component") {
      requestAnimationFrame(() => {
        walkComponents(model, (c) => ensureScoped(c, wrap, true));
      });
      return;
    }
    ensureScoped(model, wrap, false);
  };

  const onLoad = () => {
    queueMicrotask(() => {
      const wrap = getWrap();
      walkComponents(wrap, (c) => ensureScoped(c, wrap, false));
    });
  };

  editor.on("component:add", onComponentAdd);
  editor.on("load", onLoad);

  return () => {
    editor.off?.("component:add", onComponentAdd);
    editor.off?.("load", onLoad);
  };
}
