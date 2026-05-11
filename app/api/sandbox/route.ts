import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError } from "@/lib/api-response";
import { requireProjectFromRequest } from "@/lib/project-domain-resolution";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";
import { decodeVisualSavePatchBuffer } from "@/lib/visual-save-decode-patch-body";
import { injectLemnityAnchorsIntoHtmlDocument } from "@/lib/lemnity-anchor-runtime";
import { injectCarouselNavIntoHtmlDocument } from "@/lib/lemnity-carousel-nav-runtime";
import { injectDetailsTabsIntoHtmlDocument } from "@/lib/lemnity-details-tabs-runtime";
import { SANDBOX_EMPTY_PREVIEW_HTML } from "@/lib/sandbox-empty-preview-html";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

const MAX_VISUAL_EDIT_HTML_CHARS = 50_000_000;

async function respondWithHtml(projectId: string) {
  const previewUrl = await sandboxManager.getPreviewUrl(projectId);
  if (!previewUrl) {
    return apiError("Not found", 404);
  }
  const files = await sandboxManager.exportFiles(projectId);
  const candidate = files["index.html"];
  const htmlRaw =
    typeof candidate === "string" && candidate.trim().length > 0 ? candidate : SANDBOX_EMPTY_PREVIEW_HTML;
  const html = injectLemnityAnchorsIntoHtmlDocument(
    injectDetailsTabsIntoHtmlDocument(injectCarouselNavIntoHtmlDocument(htmlRaw)),
  );
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function getCurrentSandbox(req: NextRequest) {
  const project = await requireProjectFromRequest(req).catch(() => null);
  if (!project) {
    return apiError("Project not found", 404);
  }
  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  const guard = await requireDbUser();
  if (guard.ok) {
    const allowed = await sandboxManager.canAccess(project.id, guard.data.user.id);
    if (allowed) {
      if (format === "json") {
        const files = await sandboxManager.exportFiles(project.id);
        return Response.json({ files });
      }
      return respondWithHtml(project.id);
    }
  }

  if (format === "json") {
    return apiError("Not found", 404);
  }

  const publicOk =
    (await isSandboxLinkPublic(project.id).catch(() => false)) &&
    (await sandboxManager.hasSandboxPersistent(project.id).catch(() => false));
  if (!publicOk) {
    return apiError("Not found", 404);
  }
  return respondWithHtml(project.id);
}

async function patchCurrentSandbox(req: NextRequest) {
  const project = await requireProjectFromRequest(req).catch(() => null);
  if (!project) {
    return apiError("Project not found", 404);
  }
  const guard = await requireDbUser();
  if (!guard.ok) {
    return apiError("Unauthorized", 401);
  }
  const allowed = await sandboxManager.canAccess(project.id, guard.data.user.id);
  if (!allowed) {
    return apiError("Not found", 404);
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

  const updatedAt = await sandboxManager.updateIndexHtml(project.id, htmlRaw).catch(() => null);
  if (updatedAt == null) {
    return apiError("Error", 500);
  }
  return new Response(null, {
    status: 204,
    headers: {
      "x-sandbox-updated-at": String(updatedAt)
    }
  });
}

export const GET = withApiLogging("/api/sandbox", getCurrentSandbox);
export const PATCH = withApiLogging("/api/sandbox", patchCurrentSandbox);
