import type { Data } from "@measured/puck";

export function defaultLemnityPuckData() {
  return { root: { props: { title: "Страница" } }, content: [] } as Data;
}

/**
 * Puck 0.2x ожидает у каждого блока в `content` уникальный `props.id` (канвас, выбор, dnd).
 * Шаблонные JSON без id могут отрисовывать «пустой» drop-zone вместо блоков.
 */
function ensureComponentInstanceIds(data: Data): Data {
  const raw = data as { content?: unknown; root?: unknown };
  if (!Array.isArray(raw.content) || raw.content.length === 0) return data;
  let seq = 0;
  const content = raw.content.map((item: unknown) => {
    if (!item || typeof item !== "object") return item;
    const it = item as { type?: string; props?: Record<string, unknown> };
    const prevProps = it.props && typeof it.props === "object" ? it.props : {};
    const id = prevProps["id"];
    if (typeof id === "string" && id.length > 0) {
      return { ...it, props: { ...prevProps } };
    }
    seq += 1;
    const t = typeof it.type === "string" && it.type ? it.type : "Block";
    return { ...it, props: { ...prevProps, id: `${t}-${seq}` } };
  });
  return { ...data, content } as Data;
}

export function mergePuckData(loaded: unknown | null | undefined): Data {
  const base = defaultLemnityPuckData();
  if (!loaded || typeof loaded !== "object") return base;
  const o = loaded as Record<string, unknown>;
  const merged = {
    ...base,
    ...o,
    root:
      o.root && typeof o.root === "object"
        ? {
            ...((base as { root?: object }).root ?? {}),
            ...(o.root as object)
          }
        : (base as { root: unknown }).root
  } as Data;
  return ensureComponentInstanceIds(merged);
}
