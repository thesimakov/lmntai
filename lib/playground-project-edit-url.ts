/** Значение в колонке `Project.preferredEditor`. */
export type PreferredPlaygroundEditor = "build" | "box";

export function parsePreferredPlaygroundEditor(raw: unknown): PreferredPlaygroundEditor | undefined {
  if (raw === "box") return "box";
  if (raw === "build") return "build";
  return undefined;
}

export function normalizePreferredPlaygroundEditor(raw: string | null | undefined): PreferredPlaygroundEditor {
  return raw === "box" ? "box" : "build";
}

/** Публичная страница сборки AI (чат + превью). */
export function buildPlaygroundBuildEditUrl(opts: {
  projectId: string;
  sessionId?: string | null;
  /** Черновик без песочницы / сессии — как при bridge-orphan. */
  preferProjectIdQuery?: boolean;
}): string {
  const id = opts.projectId.trim();
  if (opts.sessionId) {
    return `/playground/build?sessionId=${encodeURIComponent(opts.sessionId)}`;
  }
  if (opts.preferProjectIdQuery) {
    return `/playground/build?projectId=${encodeURIComponent(id)}`;
  }
  return `/playground/build?sandboxId=${encodeURIComponent(id)}`;
}

/** Визуальный редактор Lemnity Box (canvas). */
export function buildPlaygroundBoxEditUrl(projectId: string): string {
  return `/playground/box/editor?sandboxId=${encodeURIComponent(projectId.trim())}`;
}

export function buildPlaygroundEditUrlForStoredEditor(
  editor: PreferredPlaygroundEditor,
  opts: {
    projectId: string;
    sessionId?: string | null;
    preferProjectIdQuery?: boolean;
  }
): string {
  if (editor === "box") {
    return buildPlaygroundBoxEditUrl(opts.projectId);
  }
  return buildPlaygroundBuildEditUrl({
    projectId: opts.projectId,
    sessionId: opts.sessionId,
    preferProjectIdQuery: opts.preferProjectIdQuery
  });
}
