import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

/** Сериализованный документ (outerHTML, base64, inline SVG). При прокси (nginx) выставите client_max_body_size с большим запасом (например 128m) — 50M символов в UTF-8 могут быть сотни МБ. */
const MAX_VISUAL_EDIT_HTML_CHARS = 50_000_000;

async function respondWithHtml(sandboxId: string) {
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

async function getSandbox(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const { id: sandboxId } = await params;

  const guard = await requireDbUser();
  if (guard.ok) {
    const allowed = await sandboxManager.canAccess(sandboxId, guard.data.user.id);
    if (allowed) {
      if (format === "json") {
        const files = await sandboxManager.exportFiles(sandboxId);
        return Response.json({ files });
      }
      return respondWithHtml(sandboxId);
    }
  }

  // Экспорт файлов — только владелец (авторизованный)
  if (format === "json") {
    return new Response("Not found", { status: 404 });
  }

  // HTML превью без входа — если песочница опубликована
  let publicOk = false;
  try {
    publicOk = (await isSandboxLinkPublic(sandboxId)) && sandboxManager.hasSandbox(sandboxId);
  } catch {
    publicOk = false;
  }
  if (!publicOk) {
    return new Response("Not found", { status: 404 });
  }

  return respondWithHtml(sandboxId);
}

async function patchSandbox(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id: sandboxId } = await params;
  const allowed = await sandboxManager.canAccess(sandboxId, guard.data.user.id);
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  let htmlRaw: string | null = null;
  try {
    const raw = await req.text();
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

  try {
    await sandboxManager.updateIndexHtml(sandboxId, htmlRaw);
  } catch (e) {
    return new Response((e as Error).message ?? "Error", { status: 500 });
  }
  return new Response(null, { status: 204 });
}

export const GET = withApiLogging("/api/sandbox/[id]", getSandbox);
export const PATCH = withApiLogging("/api/sandbox/[id]", patchSandbox);
