import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { isManusFullParityEnabledServer } from "@/lib/manus-parity-config";
import { listManusSessionsForUser } from "@/lib/manus-session-links";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

async function getProjects(req: NextRequest) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  if (isManusFullParityEnabledServer()) {
    const sessions = await listManusSessionsForUser(guard.data.user.id);
    const projects = sessions.map((row) => ({
      id: row.session_id,
      name: row.title || "New Session",
      status: row.status || "pending",
      updatedAt: row.latest_message_at ? new Date(row.latest_message_at * 1000).toISOString() : new Date().toISOString(),
      previewUrl: `/playground/build?sessionId=${encodeURIComponent(row.session_id)}`
    }));
    return Response.json({ projects });
  }

  const rows = await sandboxManager.listSandboxesByOwner(guard.data.user.id);
  const projects = rows.map((row) => ({
    id: row.sandboxId,
    name: row.title || "Новый проект",
    status: row.updatedAt === row.createdAt ? "Черновик" : "Готов",
    updatedAt: new Date(row.updatedAt).toISOString(),
    previewUrl: row.previewUrl
  }));

  return Response.json({ projects });
}

export const GET = withApiLogging("/api/projects", getProjects);
