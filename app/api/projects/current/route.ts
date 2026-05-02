import type { NextRequest } from "next/server";

import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { withApiLogging } from "@/lib/with-api-logging";

async function getCurrentProject(req: NextRequest) {
  let project = null as Awaited<ReturnType<typeof resolveProjectFromRequest>>;
  try {
    project = await resolveProjectFromRequest(req);
  } catch {
    project = null;
  }
  if (!project) {
    return Response.json({ project: null });
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
