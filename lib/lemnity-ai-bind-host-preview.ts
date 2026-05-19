import { lemnityAiUpstreamFetch } from "@/lib/lemnity-ai-upstream-client";
import { isLikelySandboxPreviewHtml } from "@/lib/sandbox-preview-html-detect";
import { SANDBOX_EMPTY_PREVIEW_HTML } from "@/lib/sandbox-empty-preview-html";
import { sandboxManager } from "@/lib/sandbox-manager";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { getProjectScopeForOwner } from "@/lib/project-context";

async function fetchHtmlFromArtifact(artifactId: string): Promise<string | null> {
  const id = artifactId.trim();
  if (!id.startsWith("artifact_")) return null;
  try {
    const upstream = await lemnityAiUpstreamFetch(`/artifacts/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Accept: "text/html" },
    });
    if (!upstream.ok) return null;
    const text = await upstream.text();
    if (!text.trim() || !isLikelySandboxPreviewHtml(text)) return null;
    return text;
  } catch {
    return null;
  }
}

async function fetchHtmlFromSandboxSource(sourceSandboxId: string): Promise<string | null> {
  const source = sourceSandboxId.trim();
  if (!source) return null;
  if (source.startsWith("artifact_")) {
    return fetchHtmlFromArtifact(source);
  }
  const files = await sandboxManager.exportFiles(source);
  const html = typeof files["index.html"] === "string" ? files["index.html"] : "";
  if (html.trim() && isLikelySandboxPreviewHtml(html)) return html;
  return null;
}

/**
 * Копирует HTML превью Lemnity AI (artifact_* или песочница) в постоянное состояние проекта дашборда,
 * чтобы `/api/sandbox/{projectId}` и повторный вход в редактор работали после выхода.
 */
async function persistHtmlOnHostProject(
  hostProjectId: string,
  ownerId: string,
  html: string
): Promise<boolean> {
  const projectId = hostProjectId.trim();
  const trimmed = html.trim();
  if (!projectId || !trimmed || !isLikelySandboxPreviewHtml(trimmed)) return false;

  const scope = await getProjectScopeForOwner(projectId, ownerId);
  if (!scope) return false;

  await sandboxManager.ensureSandboxStateForOwnedProject(projectId, ownerId);
  try {
    await sandboxManager.updateIndexHtml(projectId, trimmed);
    return true;
  } catch {
    const prev = await getSandboxProjectState(projectId);
    if (!prev) return false;
    await upsertSandboxProjectState({
      projectId,
      sandboxId: projectId,
      ownerId,
      title: prev.title || scope.name,
      html: trimmed,
      files: { ...prev.files, "index.html": trimmed },
    });
    return true;
  }
}

export async function bindLemnityAiPreviewHtmlToHostProject(
  hostProjectId: string,
  ownerId: string,
  html: string
): Promise<boolean> {
  return persistHtmlOnHostProject(hostProjectId, ownerId, html);
}

export async function bindLemnityAiPreviewToHostProject(
  hostProjectId: string,
  ownerId: string,
  sourceSandboxId: string
): Promise<boolean> {
  const projectId = hostProjectId.trim();
  const source = sourceSandboxId.trim();
  if (!projectId || !source) return false;

  const scope = await getProjectScopeForOwner(projectId, ownerId);
  if (!scope) return false;

  const html = await fetchHtmlFromSandboxSource(source);
  if (!html?.trim()) return false;

  return persistHtmlOnHostProject(projectId, ownerId, html);
}

export function hostPreviewLooksEmpty(html: string | undefined): boolean {
  const t = (html ?? "").trim();
  if (!t) return true;
  if (t === SANDBOX_EMPTY_PREVIEW_HTML.trim()) return true;
  return !isLikelySandboxPreviewHtml(t);
}
