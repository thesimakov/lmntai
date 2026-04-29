import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import { isProjectKind } from "@/lib/lemnity-ai-prompt-spec";

/** localStorage ключ для страницы сборки промпта (`/playground/build`). */
export const BUILDER_STORAGE_KEY = "lemnity.builder";

/** sessionStorage: уникальный токен каждого перехода «Старт» → build (обход Strict Mode и повторов с той же идеей). */
export const BUILDER_NAV_TOKEN_KEY = "lemnity.builder.navToken";

export const BUILDER_LAST_PROCESSED_NAV_KEY = "lemnity.builder.lastProcessedNavToken";

export type BuilderHandoffBuildTemplate = {
  slug: string;
  name: string;
  defaultUserPrompt: string;
};

export type BuilderHandoff = {
  idea: string;
  /** Тип доставляемого UI (согласно `lib/lemnity-ai-prompt-spec.ts`). */
  projectKind?: ProjectKind;
  /** Стартовый макет из каталога `/api/build-templates` (если выбран на /playground). */
  buildTemplate?: BuilderHandoffBuildTemplate;
  /**
   * С /playground: только превью макета, без цепочки промпта/описания и без автозапуска чата агента.
   */
  templateDirectPreview?: boolean;
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
    const btRaw = (data as { buildTemplate?: unknown }).buildTemplate;
    let buildTemplate: BuilderHandoffBuildTemplate | undefined;
    if (btRaw && typeof btRaw === "object") {
      const slug = String((btRaw as { slug?: string }).slug ?? "").trim();
      if (slug) {
        buildTemplate = {
          slug,
          name: String((btRaw as { name?: string }).name ?? "").trim() || slug,
          defaultUserPrompt: String((btRaw as { defaultUserPrompt?: string }).defaultUserPrompt ?? "")
        };
      }
    }
    return {
      idea,
      projectKind: isProjectKind(pk) ? pk : undefined,
      ...(buildTemplate ? { buildTemplate } : {}),
      ...((data as { templateDirectPreview?: boolean }).templateDirectPreview === true
        ? { templateDirectPreview: true as const }
        : {})
    };
  } catch {
    return null;
  }
}

/**
 * Режим «только превью шаблона» на /playground/build: явный флаг или старый handoff без флага,
 * где idea совпадает с названием шаблона (выбор только на странице сборки).
 */
export function isHandoffTemplateDirectPreview(h: BuilderHandoff): boolean {
  if (h.templateDirectPreview) return true;
  if (!h.buildTemplate?.slug) return false;
  const label = h.buildTemplate.name?.trim() || h.buildTemplate.slug;
  const idea = h.idea?.trim();
  return Boolean(idea && idea === label);
}

export function saveBuilderHandoff(
  idea: string,
  projectKind?: ProjectKind,
  buildTemplate?: BuilderHandoffBuildTemplate | null,
  options?: { templateDirectPreview?: boolean }
) {
  const trimmed = idea.trim();
  if (!trimmed) return;
  const payload: BuilderHandoff = {
    idea: trimmed,
    projectKind,
    ...(options?.templateDirectPreview ? { templateDirectPreview: true } : {})
  };
  if (buildTemplate?.slug?.trim()) {
    payload.buildTemplate = {
      slug: buildTemplate.slug.trim(),
      name: (buildTemplate.name || buildTemplate.slug).trim(),
      defaultUserPrompt: buildTemplate.defaultUserPrompt ?? ""
    };
  }
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
