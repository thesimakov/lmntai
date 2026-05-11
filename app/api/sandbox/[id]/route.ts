import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError } from "@/lib/api-response";
import { lemnityAiUpstreamFetch } from "@/lib/lemnity-ai-upstream-client";
import { prisma } from "@/lib/prisma";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { userCanAccessPreviewAssetStorage } from "@/lib/sandbox-preview-asset-access";
import { sandboxManager } from "@/lib/sandbox-manager";
import { decodeVisualSavePatchBuffer } from "@/lib/visual-save-decode-patch-body";
import { injectLemnityAnchorsIntoHtmlDocument } from "@/lib/lemnity-anchor-runtime";
import { injectCarouselNavIntoHtmlDocument } from "@/lib/lemnity-carousel-nav-runtime";
import { injectDetailsTabsIntoHtmlDocument } from "@/lib/lemnity-details-tabs-runtime";
import { injectCmsFormBridgeIntoHtmlDocument } from "@/lib/cms-form-bridge";
import { cmsRobotsDirectiveValue, injectCmsRobotsMetaIntoHtmlDocument } from "@/lib/cms-html-robots-meta";
import { sanitizeSandboxHtml } from "@/lib/html-sanitizer";
import { resolveCmsFormBridgeContextByProjectId } from "@/lib/cms-sandbox-form-sync";
import { SANDBOX_EMPTY_PREVIEW_HTML } from "@/lib/sandbox-empty-preview-html";
import { isLikelySandboxPreviewHtml } from "@/lib/sandbox-preview-html-detect";
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
      if (!upstream.ok) return apiError("Not found", 404);
      const htmlRaw = await upstream.text();
      const html = injectLemnityAnchorsIntoHtmlDocument(
        injectDetailsTabsIntoHtmlDocument(injectCarouselNavIntoHtmlDocument(htmlRaw)),
      );
      return new Response(html, {
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    } catch {
      return apiError("Not found", 404);
    }
  }
  return respondWithHtml(sandboxId);
}

async function respondWithHtml(sandboxId: string): Promise<Response> {
  const previewUrl = await sandboxManager.getPreviewUrl(sandboxId);
  if (!previewUrl) {
    return apiError("Not found", 404);
  }

  const files = await sandboxManager.exportFiles(sandboxId);
  let htmlRaw = typeof files["index.html"] === "string" ? files["index.html"] : "";

  if (!htmlRaw.trim() && !sandboxId.startsWith("artifact_")) {
    const link = await prisma.manusSessionLink.findFirst({
      where: { projectId: sandboxId },
      select: { previewArtifactId: true }
    });
    const aid = typeof link?.previewArtifactId === "string" ? link.previewArtifactId.trim() : "";
    if (aid.startsWith("artifact_")) {
      return respondWithPublishedHtml(aid);
    }
  }

  const looksLikePreview = htmlRaw.trim().length > 0 && isLikelySandboxPreviewHtml(htmlRaw);
  if (!looksLikePreview) {
    htmlRaw = SANDBOX_EMPTY_PREVIEW_HTML;
  }
  let xRobotsTag: string | null = null;
  if (!sandboxId.startsWith("artifact_")) {
    const bridgeCtx = await resolveCmsFormBridgeContextByProjectId(sandboxId);
    if (bridgeCtx) {
      htmlRaw = injectCmsFormBridgeIntoHtmlDocument(htmlRaw, bridgeCtx);
      const seoPage = await prisma.cmsPage.findFirst({
        where: { id: bridgeCtx.pageId, siteId: bridgeCtx.siteId },
        select: { noIndex: true, seoNoFollow: true },
      });
      htmlRaw = injectCmsRobotsMetaIntoHtmlDocument(htmlRaw, {
        noIndex: seoPage?.noIndex,
        noFollow: seoPage?.seoNoFollow,
      });
      xRobotsTag = cmsRobotsDirectiveValue(seoPage?.noIndex, seoPage?.seoNoFollow);
    }
  }
  const html = injectLemnityAnchorsIntoHtmlDocument(
    injectDetailsTabsIntoHtmlDocument(injectCarouselNavIntoHtmlDocument(htmlRaw)),
  );
  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (xRobotsTag) {
    headers["X-Robots-Tag"] = xRobotsTag;
  }
  return new Response(html, { headers });
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
        return apiError("Not found", 404);
      }
      return { sandboxId: routeId };
    }
    if (routeId !== resolvedProject.id) {
      return apiError("Not found", 404);
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
          return apiError("Not found", 404);
        }
        const files = await sandboxManager.exportFiles(sandboxId);
        return Response.json({ files });
      }
      return respondWithPublishedHtml(sandboxId);
    }
  }

  // Экспорт файлов — только владелец (авторизованный)
  if (format === "json") {
    return apiError("Not found", 404);
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
    return apiError("Not found", 404);
  }

  return respondWithPublishedHtml(sandboxId);
}

async function patchSandbox(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return apiError("Unauthorized", 401);
  }
  const { id: routeId } = await params;
  const resolved = await resolveSandboxIdForRequest(req, routeId);
  if (resolved instanceof Response) {
    return resolved;
  }
  const { sandboxId } = resolved;
  const allowed = await userCanAccessPreviewAssetStorage(guard.data.user.id, sandboxId);
  if (!allowed) {
    return apiError("Not found", 404);
  }
  if (sandboxId.startsWith("artifact_")) {
    return apiError("Not found", 404);
  }

  try {
    await sandboxManager.ensureSandboxStateForOwnedProject(sandboxId, guard.data.user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_NOT_FOUND") {
      return apiError("Not found", 404);
    }
    console.error("[PATCH /api/sandbox/[id]] ensureSandboxStateForOwnedProject", e);
    return apiError(msg || "Error", 500);
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
    return apiError("Bad request", 400);
  }
  if (htmlRaw == null) {
    return apiError("Bad request", 400);
  }
  if (htmlRaw.length > MAX_VISUAL_EDIT_HTML_CHARS) {
    return apiError("Payload too large", 413);
  }

  const htmlSanitized = sanitizeSandboxHtml(htmlRaw);

  let updatedAt: number;
  try {
    updatedAt = await sandboxManager.updateIndexHtml(sandboxId, htmlSanitized);
  } catch (e) {
    return apiError((e as Error).message ?? "Error", 500);
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
