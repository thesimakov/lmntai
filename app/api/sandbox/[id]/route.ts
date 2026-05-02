import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { lemnityAiUpstreamFetch } from "@/lib/lemnity-ai-upstream-client";
import { prisma } from "@/lib/prisma";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { userCanAccessPreviewAssetStorage } from "@/lib/sandbox-preview-asset-access";
import { sandboxManager } from "@/lib/sandbox-manager";
import { decodeVisualSavePatchBuffer } from "@/lib/visual-save-decode-patch-body";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

/** Сериализованный документ (outerHTML, base64, inline SVG). При прокси (nginx) выставите client_max_body_size с большим запасом (например 128m) — 50M символов в UTF-8 могут быть сотни МБ. */
const MAX_VISUAL_EDIT_HTML_CHARS = 50_000_000;

async function respondWithPublishedHtml(sandboxId: string): Promise<Response> {
  if (sandboxId.startsWith("artifact_")) {
    try {
      const upstream = await lemnityAiUpstreamFetch(`/artifacts/${encodeURIComponent(sandboxId)}`, {
        method: "GET",
        headers: { Accept: "text/html" }
      });
      if (!upstream.ok) return new Response("Not found", { status: 404 });
      const html = await upstream.text();
      return new Response(html, {
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }
  return respondWithHtml(sandboxId);
}

async function respondWithHtml(sandboxId: string): Promise<Response> {
  const previewUrl = await sandboxManager.getPreviewUrl(sandboxId);
  if (!previewUrl) {
    return new Response("Not found", { status: 404 });
  }

  const files = await sandboxManager.exportFiles(sandboxId);
  const html = files["index.html"] ?? "<html><body>Empty</body></html>";
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

/** На опубликованном поддомене middleware передаёт проект; путь `/api/sandbox/artifact_*` должен сопоставляться с previewArtifactId сессии. */
async function resolveSandboxIdForRequest(req: NextRequest, routeId: string): Promise<Response | { sandboxId: string }> {
  const resolvedProject = await resolveProjectFromRequest(req);
  if (resolvedProject) {
    if (routeId.startsWith("artifact_")) {
      const row = await prisma.manusSessionLink.findFirst({
        where: { projectId: resolvedProject.id, previewArtifactId: routeId },
        select: { id: true }
      });
      if (!row) {
        return new Response("Not found", { status: 404 });
      }
      return { sandboxId: routeId };
    }
    if (routeId !== resolvedProject.id) {
      return new Response("Not found", { status: 404 });
    }
    return { sandboxId: resolvedProject.id };
  }
  return { sandboxId: routeId };
}

async function getSandbox(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const { id: routeId } = await params;
  const resolved = await resolveSandboxIdForRequest(req, routeId);
  if (resolved instanceof Response) {
    return resolved;
  }
  const { sandboxId } = resolved;

  const guard = await requireDbUser();
  if (guard.ok) {
    const allowed = await userCanAccessPreviewAssetStorage(guard.data.user.id, sandboxId);
    if (allowed) {
      if (format === "json") {
        if (sandboxId.startsWith("artifact_")) {
          return new Response("Not found", { status: 404 });
        }
        const files = await sandboxManager.exportFiles(sandboxId);
        return Response.json({ files });
      }
      return respondWithPublishedHtml(sandboxId);
    }
  }

  // Экспорт файлов — только владелец (авторизованный)
  if (format === "json") {
    return new Response("Not found", { status: 404 });
  }

  // HTML превью без входа — если песочница опубликована
  let publicOk = false;
  try {
    const pub = await isSandboxLinkPublic(sandboxId);
    if (pub) {
      publicOk =
        sandboxId.startsWith("artifact_") || (await sandboxManager.hasSandboxPersistent(sandboxId));
    }
  } catch {
    publicOk = false;
  }
  if (!publicOk) {
    return new Response("Not found", { status: 404 });
  }

  return respondWithPublishedHtml(sandboxId);
}

async function patchSandbox(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id: routeId } = await params;
  const resolved = await resolveSandboxIdForRequest(req, routeId);
  if (resolved instanceof Response) {
    return resolved;
  }
  const { sandboxId } = resolved;
  const allowed = await userCanAccessPreviewAssetStorage(guard.data.user.id, sandboxId);
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }
  if (sandboxId.startsWith("artifact_")) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  let htmlRaw: string | null = null;
  try {
    const rawBuf = Buffer.from(await req.arrayBuffer());
    const decoded = decodeVisualSavePatchBuffer(rawBuf, req.headers.get("content-encoding"));
    const raw = decoded.toString("utf8");
    if (contentType.includes("text/html")) {
      htmlRaw = raw.length > 0 ? raw : null;
    } else {
      const body = JSON.parse(raw || "null") as unknown;
      htmlRaw =
        body && typeof body === "object" && typeof (body as { html?: unknown }).html === "string"
          ? (body as { html: string }).html
          : null;
    }
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (htmlRaw == null) {
    return new Response("Bad request", { status: 400 });
  }
  if (htmlRaw.length > MAX_VISUAL_EDIT_HTML_CHARS) {
    return new Response("Payload too large", { status: 413 });
  }

  let updatedAt: number;
  try {
    updatedAt = await sandboxManager.updateIndexHtml(sandboxId, htmlRaw);
  } catch (e) {
    return new Response((e as Error).message ?? "Error", { status: 500 });
  }
  return new Response(null, {
    status: 204,
    headers: {
      "x-sandbox-updated-at": String(updatedAt)
    }
  });
}

export const GET = withApiLogging("/api/sandbox/[id]", getSandbox);
export const PATCH = withApiLogging("/api/sandbox/[id]", patchSandbox);
