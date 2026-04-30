/**
 * Слияние `puck.json` после очередной выдачи модели в билд-сессию.
 * Если пользователь уже сохранил макет через Puck, а модель снова подставляет тот же шаблонный
 * JSON пресета («попугай»), не перезаписываем сохранённый файл.
 */
import { IT_STARTUP_PUCK_JSON } from "@/lib/build-template-presets/it-startup-preset";
import { MASSAGE_PUCK_JSON } from "@/lib/build-template-presets/massage-preset";
import { PR_LEAD_PUCK_JSON } from "@/lib/build-template-presets/lead-pr-preset";
import { WEB_STUDIO_PUCK_JSON } from "@/lib/build-template-presets/web-studio-preset";

import type { MemoryState } from "@/lib/sandbox-stores";

export function normalizePuckJsonCanonical(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s));
  } catch {
    return s.trim();
  }
}

const CANON_TEMPLATE_PUCK_JSON = new Set(
  [MASSAGE_PUCK_JSON, IT_STARTUP_PUCK_JSON, PR_LEAD_PUCK_JSON, WEB_STUDIO_PUCK_JSON].map((x) =>
    normalizePuckJsonCanonical(x)
  )
);

/** Нормализованный JSON совпадает с канонической строкой какого‑либо встроенного пресета. */
export function isCanonicalTemplatePuckJson(normalized: string): boolean {
  return CANON_TEMPLATE_PUCK_JSON.has(normalized);
}

export type PuckMergeDecision = { kind: "none" } | { kind: "value"; json: string };

/** Выбор финального содержимого `puck.json` при применении ответа модели. */
export function mergePuckForApply(prevPuck: string | undefined, incomingPuck: string | undefined): PuckMergeDecision {
  const hasPrev = typeof prevPuck === "string" && prevPuck.trim().length > 0;
  const hasInc = typeof incomingPuck === "string" && incomingPuck.trim().length > 0;

  if (!hasPrev && !hasInc) return { kind: "none" };
  if (!hasPrev && hasInc) return { kind: "value", json: incomingPuck!.trimEnd() };
  if (hasPrev && !hasInc) return { kind: "value", json: prevPuck!.trimEnd() };

  const exN = normalizePuckJsonCanonical(prevPuck!);
  const inN = normalizePuckJsonCanonical(incomingPuck!);
  if (inN === exN) return { kind: "value", json: incomingPuck!.trimEnd() };

  if (isCanonicalTemplatePuckJson(inN) && inN !== exN) {
    return { kind: "value", json: prevPuck!.trimEnd() };
  }
  return { kind: "value", json: incomingPuck!.trimEnd() };
}

export function mergeFilesPreservingUserPuck(
  previous: MemoryState | undefined,
  nextFiles: Record<string, string>
): Record<string, string> {
  const out = { ...nextFiles };
  const prevPuck = typeof previous?.files?.["puck.json"] === "string" ? previous.files["puck.json"] : undefined;
  const incoming = typeof out["puck.json"] === "string" ? out["puck.json"] : undefined;

  const m = mergePuckForApply(prevPuck, incoming);
  if (m.kind === "none") {
    delete out["puck.json"];
    return out;
  }
  out["puck.json"] = m.json;
  return out;
}
