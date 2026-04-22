import type { NextRequest } from "next/server";

import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getSandbox(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const sandboxId = params.id;

  if (format === "json") {
    const files = await sandboxManager.exportFiles(sandboxId);
    return Response.json({ files });
  }

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

export const GET = withApiLogging("/api/sandbox/[id]", getSandbox);

