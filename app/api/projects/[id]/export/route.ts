import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { exportProject } from "@/lib/project-export";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getProjectExport(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }
  const { id } = await params;
  const routeProjectId = typeof id === "string" ? decodeURIComponent(id).trim() : "";
  const resolvedProject = await resolveProjectFromRequest(req);
  if (resolvedProject && routeProjectId !== resolvedProject.id) {
    return new Response("Not found", { status: 404 });
  }
  const projectId = resolvedProject?.id ?? routeProjectId;
  if (!projectId) {
    return new Response("project_id is required", { status: 400 });
  }

  try {
    const archive = await exportProject(projectId, guard.data.user.id);
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

export const GET = withApiLogging("/api/projects/[id]/export", getProjectExport);
