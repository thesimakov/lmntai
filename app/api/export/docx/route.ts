import type { NextRequest } from "next/server";
import HTMLtoDOCX from "html-to-docx";

import { requireDbUser } from "@/lib/auth-guards";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

const MAX_HTML_CHARS = 2_000_000;

async function postDocx(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  let html: string | null = null;
  let downloadName = "resume.docx";
  const resolvedProject = await resolveProjectFromRequest(req);

  if (body && typeof body === "object") {
    const b = body as { projectId?: unknown; filename?: unknown };
    const requestedProjectId = typeof b.projectId === "string" ? b.projectId.trim() : "";
    if (resolvedProject && requestedProjectId && requestedProjectId !== resolvedProject.id) {
      return new Response("Project mismatch for current domain", { status: 404 });
    }
    const projectId = resolvedProject?.id ?? requestedProjectId;
    if (!projectId) {
      return new Response("project_id is required", { status: 400 });
    }
    const allowed = await sandboxManager.canAccess(projectId, guard.data.user.id);
    if (!allowed) {
      return new Response("Not found", { status: 404 });
    }
    const files = await sandboxManager.exportFiles(projectId);
    html = files["index.html"] ?? null;
    if (typeof b.filename === "string" && b.filename.trim().endsWith(".docx")) {
      downloadName = b.filename.trim().slice(-120);
    }
  }

  if (!html?.trim()) {
    return new Response("Bad request", { status: 400 });
  }
  if (html.length > MAX_HTML_CHARS) {
    return new Response("Payload too large", { status: 413 });
  }

  try {
    const buf = await HTMLtoDOCX(html, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false
    });
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${downloadName.replace(/"/g, "")}"`
      }
    });
  } catch (e) {
    return new Response((e as Error).message ?? "conversion_failed", { status: 500 });
  }
}

export const POST = withApiLogging("/api/export/docx", postDocx);
