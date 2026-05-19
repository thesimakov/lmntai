import { coalesceSandboxIdFromBridgePreview } from "@/lib/preview-share";
import { LEMNITY_AI_BRIDGE_API_PREFIX } from "@/lib/lemnity-ai-bridge-config";
import type { LemnityAiSessionListItem } from "@/lib/lemnity-ai-session-links";

type BridgeEnvelope<T> = {
  code?: number;
  data?: T;
};

export type BuildSessionLinkMeta = {
  hostProjectId: string;
  upstreamSessionId: string;
  previewArtifactId: string | null;
};

export function buildArtifactPreviewUrl(artifactId: string): string {
  return `/api/lemnity-ai/artifacts/${encodeURIComponent(artifactId)}`;
}

export function buildSandboxPreviewUrl(sandboxId: string): string {
  return `/api/sandbox/${encodeURIComponent(sandboxId)}?t=${Date.now()}`;
}

/** Список сессий дашборда (ManusSessionLink). */
export async function fetchDashboardSessionLinks(): Promise<LemnityAiSessionListItem[]> {
  const res = await fetch(`${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return [];
  const envelope = (await res.json().catch(() => null)) as BridgeEnvelope<{
    sessions?: LemnityAiSessionListItem[];
  }> | null;
  return Array.isArray(envelope?.data?.sessions) ? envelope.data.sessions : [];
}

export function findDashboardSessionLink(
  links: LemnityAiSessionListItem[],
  pathId: string
): LemnityAiSessionListItem | undefined {
  const id = pathId.trim();
  if (!id) return undefined;
  return links.find((row) => row.session_id === id || row.project_id === id);
}

type BridgeSessionsListEnvelope = {
  code?: number;
  data?: { sessions?: LemnityAiSessionListItem[] };
};

async function loadSessionsList(url: string): Promise<LemnityAiSessionListItem[]> {
  const res = await fetch(url, { method: "GET", credentials: "include", cache: "no-store" });
  if (!res.ok) return [];
  const envelope = (await res.json().catch(() => null)) as BridgeSessionsListEnvelope | null;
  if (envelope?.code !== 0) return [];
  return Array.isArray(envelope.data?.sessions) ? envelope.data!.sessions! : [];
}

/** Список сессий моста + фильтр по projectId (как repair во вкладке «Код»). */
export async function fetchSessionLinkForPathId(pathId: string): Promise<LemnityAiSessionListItem | null> {
  const id = pathId.trim();
  if (!id) return null;

  const all = await fetchDashboardSessionLinks();
  const fromCache = findDashboardSessionLink(all, id);
  if (fromCache) return fromCache;

  const scoped = await loadSessionsList(
    `${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions?projectId=${encodeURIComponent(id)}`
  );
  const fromScoped = findDashboardSessionLink(scoped, id);
  if (fromScoped) return fromScoped;

  const full = await loadSessionsList(`${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions`);
  return findDashboardSessionLink(full, id) ?? null;
}

export type BridgePreviewPick = {
  previewUrl: string;
  sandboxId: string;
  mimeType?: string;
  filename?: string | null;
};

export function extractLastBridgePreviewFromEvents(events: unknown): BridgePreviewPick | null {
  if (!Array.isArray(events)) return null;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const row = events[i];
    if (!row || typeof row !== "object") continue;
    const rec = row as { event?: string; data?: Record<string, unknown> };
    if (rec.event !== "preview" || !rec.data) continue;
    const previewUrl = typeof rec.data.previewUrl === "string" ? rec.data.previewUrl.trim() : "";
    const sandboxId = coalesceSandboxIdFromBridgePreview({
      previewUrl: previewUrl || null,
      sandboxId: typeof rec.data.sandboxId === "string" ? rec.data.sandboxId : null,
    });
    if (!previewUrl || !sandboxId) continue;
    return {
      previewUrl,
      sandboxId,
      mimeType: typeof rec.data.mimeType === "string" ? rec.data.mimeType : undefined,
      filename: typeof rec.data.filename === "string" ? rec.data.filename : null,
    };
  }
  return null;
}

export function toBuildSessionLinkMeta(row: LemnityAiSessionListItem): BuildSessionLinkMeta {
  const upstreamSessionId = row.session_id.trim();
  const hostProjectId = row.project_id.trim() || upstreamSessionId;
  const previewArtifactId =
    typeof row.preview_artifact_id === "string" && row.preview_artifact_id.startsWith("artifact_")
      ? row.preview_artifact_id
      : null;
  return { hostProjectId, upstreamSessionId, previewArtifactId };
}

/** Есть ли в песочнице реальный HTML (не плейсхолдер пустого превью). */
export async function sandboxHasRenderablePreview(sandboxId: string): Promise<boolean> {
  const id = sandboxId.trim();
  if (!id || id.startsWith("artifact_")) return false;
  try {
    const res = await fetch(buildSandboxPreviewUrl(id), { credentials: "include", cache: "no-store" });
    if (!res.ok) return false;
    const html = await res.text();
    if (html.length < 120) return false;
    if (html.includes("splashFade") || html.includes('class="orbits"')) return false;
    return true;
  } catch {
    return false;
  }
}
