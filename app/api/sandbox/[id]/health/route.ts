import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getSandboxHealth(
  _req: NextRequest,
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

  const health = await sandboxManager.diagnoseSandboxState(sandboxId);
  return Response.json(health, { status: 200 });
}

export const GET = withApiLogging("/api/sandbox/[id]/health", getSandboxHealth);
