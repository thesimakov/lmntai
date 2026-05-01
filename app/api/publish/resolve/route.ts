import type { NextRequest } from "next/server";

import { resolveProjectByHost } from "@/lib/publish-domain-service";
import { withApiLogging } from "@/lib/with-api-logging";

async function getResolvePublishHost(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host") ?? req.headers.get("x-publish-host") ?? "";
  if (!host) {
    return Response.json({ projectId: null, subdomain: null }, { status: 400 });
  }
  const project = await resolveProjectByHost(host);
  if (!project) {
    return Response.json({ projectId: null, subdomain: null }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(
    {
      projectId: project.projectId,
      subdomain: project.subdomain
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export const GET = withApiLogging("/api/publish/resolve", getResolvePublishHost);
