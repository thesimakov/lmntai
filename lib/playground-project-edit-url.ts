/** Значение в колонке `Project.preferredEditor`. */
export type PreferredPlaygroundEditor = "build" | "box" | "analytics" | "marketing" | "presentation";

export function parsePreferredPlaygroundEditor(raw: unknown): PreferredPlaygroundEditor | undefined {
  if (raw === "box") return "box";
  if (raw === "build") return "build";
  if (raw === "analytics") return "analytics";
  if (raw === "marketing") return "marketing";
  if (raw === "presentation") return "presentation";
  /** Старое значение в БД и клиентах → трактуем как build. */
  if (raw === "webstudio") return "build";
  return undefined;
}

export function normalizePreferredPlaygroundEditor(raw: string | null | undefined): PreferredPlaygroundEditor {
  if (raw === "box") return "box";
  if (raw === "analytics") return "analytics";
  if (raw === "marketing") return "marketing";
  if (raw === "presentation") return "presentation";
  if (raw === "webstudio") return "build";
  return "build";
}

/** Публичная страница сборки AI (чат + превью). */
export function buildPlaygroundBuildEditUrl(opts: {
  projectId: string;
  sessionId?: string | null;
  /** Черновик без песочницы / сессии — как при bridge-orphan. */
  preferProjectIdQuery?: boolean;
  projectKind?: string | null;
}): string {
  const id = opts.projectId.trim();
  const kindSuffix = opts.projectKind ? `&projectKind=${encodeURIComponent(opts.projectKind)}` : "";
  if (opts.preferProjectIdQuery) {
    return `/playground/build?projectId=${encodeURIComponent(id)}${kindSuffix}`;
  }
  const session = (opts.sessionId ?? id).trim();
  if (session) {
    return `/playground/build?sessionId=${encodeURIComponent(session)}${kindSuffix}`;
  }
  return `/playground/build?sandboxId=${encodeURIComponent(id)}${kindSuffix}`;
}

/** Визуальный редактор Lemnity Box (canvas). */
export function buildPlaygroundBoxEditUrl(projectId: string): string {
  return `/playground/box/editor?sandboxId=${encodeURIComponent(projectId.trim())}`;
}

/** Analytics / BI dashboard editor. */
export function buildPlaygroundAnalyticsEditUrl(projectId: string): string {
  return `/playground/analytics?projectId=${encodeURIComponent(projectId)}`;
}

/** Marketing Analytics editor. */
export function buildPlaygroundMarketingEditUrl(
  projectId: string,
  opts?: { goal?: string; channel?: string; lang?: string }
): string {
  const params = new URLSearchParams({ projectId: projectId.trim() });
  const goal = opts?.goal?.trim();
  const channel = opts?.channel?.trim();
  if (goal) params.set("goal", goal);
  if (channel) params.set("channel", channel);
  if (opts?.lang) params.set("lang", opts.lang);
  return `/playground/marketing?${params.toString()}`;
}

/** Presentation (SlideGraph) editor — uses build page with projectKind=presentation. */
export function buildPlaygroundPresentationEditUrl(projectId: string): string {
  return `/playground/build?sessionId=${encodeURIComponent(projectId)}&projectKind=presentation`;
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
  if (editor === "analytics") {
    return buildPlaygroundAnalyticsEditUrl(opts.projectId);
  }
  if (editor === "marketing") {
    return buildPlaygroundMarketingEditUrl(opts.projectId);
  }
  if (editor === "presentation") {
    return buildPlaygroundPresentationEditUrl(opts.projectId);
  }
  return buildPlaygroundBuildEditUrl({
    projectId: opts.projectId,
    sessionId: opts.sessionId,
    preferProjectIdQuery: opts.preferProjectIdQuery
  });
}
