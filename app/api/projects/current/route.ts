import type { NextRequest } from "next/server";

import { requireProjectFromRequest } from "@/lib/project-domain-resolution";
import { withApiLogging } from "@/lib/with-api-logging";

async function getCurrentProject(req: NextRequest) {
  const project = await requireProjectFromRequest(req).catch(() => null);
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }
  return Response.json({
    project: {
      id: project.id,
      name: project.name,
      subdomain: project.subdomain
    }
  });
}

export const GET = withApiLogging("/api/projects/current", getCurrentProject);
