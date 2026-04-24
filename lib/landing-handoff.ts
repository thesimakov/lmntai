import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import { isProjectKind } from "@/lib/lemnity-ai-prompt-spec";

/** localStorage ключ для страницы сборки промпта (`/playground/build`). */
export const BUILDER_STORAGE_KEY = "lemnity.builder";

export type BuilderHandoff = {
  idea: string;
  /** Тип доставляемого UI (согласно `lib/lemnity-ai-prompt-spec.ts`). */
  projectKind?: ProjectKind;
};

export function readBuilderHandoff(): BuilderHandoff | null {
  try {
    const raw = localStorage.getItem(BUILDER_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (typeof data !== "object" || data === null) return null;
    const idea = (data as { idea?: string }).idea?.trim();
    if (!idea) return null;
    const pk = (data as { projectKind?: string }).projectKind;
    return {
      idea,
      projectKind: isProjectKind(pk) ? pk : undefined
    };
  } catch {
    return null;
  }
}

export function saveBuilderHandoff(idea: string, projectKind?: ProjectKind) {
  const trimmed = idea.trim();
  if (!trimmed) return;
  const payload: BuilderHandoff = { idea: trimmed, projectKind };
  try {
    localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(payload));
    sessionStorage.setItem("lemnity.landing.prompt", trimmed);
  } catch {
    // ignore
  }
}
