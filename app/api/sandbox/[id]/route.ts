import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

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

export const GET = withApiLogging("/api/sandbox/[id]", getSandbox);
