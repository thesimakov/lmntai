import type { Data } from "@measured/puck";

export function defaultLemnityPuckData() {
  return { root: { props: { title: "Страница" } }, content: [] } as Data;
}

export function mergePuckData(loaded: unknown | null | undefined): Data {
  const base = defaultLemnityPuckData();
  if (!loaded || typeof loaded !== "object") return base;
  const o = loaded as Record<string, unknown>;
  return {
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
}
