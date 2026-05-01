import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectFromRequest } from "@/lib/project-domain-resolution";
import { exportProject } from "@/lib/project-export";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getCurrentProjectExport(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }
  const project = await requireProjectFromRequest(req).catch(() => null);
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }
  try {
    const archive = await exportProject(project.id, guard.data.user.id);
    return new Response(new Uint8Array(archive.data), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archive.filename.replace(/"/g, "")}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
}

export const GET = withApiLogging("/api/projects/current/export", getCurrentProjectExport);
