import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { isLemnityAiBridgeEnabledServer } from "@/lib/lemnity-ai-bridge-config";
import { deleteLemnityAiSessionForUser } from "@/lib/lemnity-ai-session-links";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { deleteProjectCellForOwner } from "@/lib/project-context";
import { destroySandbox, sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

async function deleteProject(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const { id: raw } = await params;
  const routeProjectId = typeof raw === "string" ? decodeURIComponent(raw) : "";
  const resolvedProject = await resolveProjectFromRequest(req);
  if (resolvedProject && routeProjectId !== resolvedProject.id) {
    return new Response("Not found", { status: 404 });
  }
  const id = resolvedProject?.id ?? routeProjectId;
  if (!id || id.length > 500) {
    return new Response("Invalid project id", { status: 400 });
  }

  const userId = guard.data.user.id;

  if (isLemnityAiBridgeEnabledServer()) {
    await deleteLemnityAiSessionForUser(userId, id);
    const cellRemoved = await deleteProjectCellForOwner(id, userId);
    if (!cellRemoved) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(null, { status: 204 });
  }

  const allowed = await sandboxManager.canAccess(id, userId);
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }
  await destroySandbox(id);
  await deleteProjectCellForOwner(id, userId);
  return new Response(null, { status: 204 });
}

export const DELETE = withApiLogging("/api/projects/[id]", deleteProject);
