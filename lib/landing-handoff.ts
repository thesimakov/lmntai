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
  /** Формат контента: несколько страниц одного шаблона или одна страница (главная и т.п.). */
  sitePageFormat?: "reusable" | "single";
  /** Уникальный идентификатор типа/шаблона в стиле API (латиница, цифры, подчёркивание). */
  pageTypeApiId?: string;
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
    const sitePageFormatRaw = (data as { sitePageFormat?: string }).sitePageFormat;
    const sitePageFormat =
      sitePageFormatRaw === "reusable" || sitePageFormatRaw === "single" ? sitePageFormatRaw : undefined;
    const pageTypeApiIdRaw = (data as { pageTypeApiId?: string }).pageTypeApiId;
    const pageTypeApiId =
      typeof pageTypeApiIdRaw === "string" && pageTypeApiIdRaw.trim().length > 0
        ? pageTypeApiIdRaw.trim()
        : undefined;
    return {
      idea,
      projectKind: isProjectKind(pk) ? pk : undefined,
      ...(buildTemplate ? { buildTemplate } : {}),
      ...((data as { templateDirectPreview?: boolean }).templateDirectPreview === true
        ? { templateDirectPreview: true as const }
        : {}),
      ...(sitePageFormat ? { sitePageFormat } : {}),
      ...(pageTypeApiId ? { pageTypeApiId } : {})
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

export type SaveBuilderHandoffOptions = {
  templateDirectPreview?: boolean;
  sitePageFormat?: "reusable" | "single";
  pageTypeApiId?: string;
};

export function saveBuilderHandoff(
  idea: string,
  projectKind?: ProjectKind,
  buildTemplate?: BuilderHandoffBuildTemplate | null,
  options?: SaveBuilderHandoffOptions
) {
  const trimmed = idea.trim();
  if (!trimmed) return;

  const prev = readBuilderHandoff();

  /** Явный `null` сбрасывает шаблон; опущенный аргумент сливается с предыдущим handoff (не затирает шаблон при смене только idea). */
  const mergedProjectKind =
    buildTemplate === null
      ? projectKind
      : projectKind !== undefined
        ? projectKind
        : prev?.projectKind;

  let mergedBuildTemplate: BuilderHandoffBuildTemplate | undefined;
  let mergedDirectPreview: boolean | undefined;

  if (buildTemplate === null) {
    mergedBuildTemplate = undefined;
    mergedDirectPreview =
      options?.templateDirectPreview === true ? true : undefined;
  } else if (buildTemplate !== undefined && buildTemplate.slug?.trim()) {
    mergedBuildTemplate = {
      slug: buildTemplate.slug.trim(),
      name: (buildTemplate.name || buildTemplate.slug).trim(),
      defaultUserPrompt: buildTemplate.defaultUserPrompt ?? ""
    };
    mergedDirectPreview =
      options?.templateDirectPreview === true ? true : undefined;
  } else if (prev?.buildTemplate) {
    mergedBuildTemplate = prev.buildTemplate;
    mergedDirectPreview =
      options?.templateDirectPreview === true
        ? true
        : prev.templateDirectPreview === true
          ? true
          : undefined;
  } else {
    mergedBuildTemplate = undefined;
    mergedDirectPreview =
      options?.templateDirectPreview === true ? true : undefined;
  }

  const payload: BuilderHandoff = { idea: trimmed };
  if (mergedProjectKind) payload.projectKind = mergedProjectKind;
  if (mergedBuildTemplate) payload.buildTemplate = mergedBuildTemplate;
  if (mergedDirectPreview) payload.templateDirectPreview = true;

  const fmtOpt = options?.sitePageFormat;
  const mergedFormat =
    fmtOpt === "reusable" || fmtOpt === "single"
      ? fmtOpt
      : prev?.sitePageFormat === "reusable" || prev?.sitePageFormat === "single"
        ? prev.sitePageFormat
        : undefined;
  if (mergedFormat) payload.sitePageFormat = mergedFormat;

  const apiFromOptions = options?.pageTypeApiId;
  const mergedApiId =
    apiFromOptions !== undefined
      ? apiFromOptions.trim() || undefined
      : prev?.pageTypeApiId?.trim();
  if (mergedApiId) payload.pageTypeApiId = mergedApiId;

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
