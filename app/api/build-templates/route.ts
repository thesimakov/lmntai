import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { listBuildTemplates } from "@/lib/build-templates";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getBuildTemplates(_req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }
  const templates = await listBuildTemplates();
  return Response.json({ templates });
}

export const GET = withApiLogging("/api/build-templates", getBuildTemplates);
