import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import { isProjectKind } from "@/lib/lemnity-ai-prompt-spec";

/** localStorage ключ для страницы сборки промпта (`/playground/build`). */
export const BUILDER_STORAGE_KEY = "lemnity.builder";

/** sessionStorage: уникальный токен каждого перехода «Старт» → build (обход Strict Mode и повторов с той же идеей). */
export const BUILDER_NAV_TOKEN_KEY = "lemnity.builder.navToken";

export const BUILDER_LAST_PROCESSED_NAV_KEY = "lemnity.builder.lastProcessedNavToken";

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
    const navToken =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(BUILDER_NAV_TOKEN_KEY, navToken);
  } catch {
    // ignore
  }
}
