import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { isLemnityAiBridgeEnabledServer } from "@/lib/lemnity-ai-bridge-config";
import { listLemnityAiSessionsForUser } from "@/lib/lemnity-ai-session-links";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

async function getProjects(req: NextRequest) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  if (isLemnityAiBridgeEnabledServer()) {
    const sessions = await listLemnityAiSessionsForUser(guard.data.user.id);
    const projects = sessions.map((row) => {
      const sessionId = row.session_id;
      const artifact =
        typeof row.preview_artifact_id === "string" && row.preview_artifact_id.startsWith("artifact_")
          ? row.preview_artifact_id
          : null;
      const embedUrl = artifact ? `/api/lemnity-ai/artifacts/${encodeURIComponent(artifact)}` : null;
      const updatedAt = row.latest_message_at
        ? new Date(row.latest_message_at * 1000).toISOString()
        : new Date().toISOString();
      const createdAt =
        typeof row.created_at === "string" && row.created_at.length > 0 ? row.created_at : updatedAt;
      return {
        id: sessionId,
        name: row.title?.trim() || "Проект",
        status: row.status || "pending",
        createdAt,
        updatedAt,
        embedUrl,
        editUrl: `/playground/build?sessionId=${encodeURIComponent(sessionId)}`,
        openUrl: embedUrl ?? `/playground/build?sessionId=${encodeURIComponent(sessionId)}`
      };
    });
    return Response.json({ projects });
  }

  const rows = await sandboxManager.listSandboxesByOwner(guard.data.user.id);
  const projects = rows.map((row) => ({
    id: row.sandboxId,
    name: row.title || "Новый проект",
    status: row.updatedAt === row.createdAt ? "Черновик" : "Готов",
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    embedUrl: `/api/sandbox/${row.sandboxId}`,
    editUrl: "/playground/build",
    openUrl: `/api/sandbox/${row.sandboxId}`
  }));

  return Response.json({ projects });
}

export const GET = withApiLogging("/api/projects", getProjects);
