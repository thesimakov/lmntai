import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { isLemnityAiBridgeEnabledServer } from "@/lib/lemnity-ai-bridge-config";
import { listLemnityAiSessionsForUser } from "@/lib/lemnity-ai-session-links";
import { prisma } from "@/lib/prisma";
import { checkProjectCreationAllowed } from "@/lib/project-limits";
import { normalizeProjectSubdomain, upsertProjectCell } from "@/lib/project-context";
import { sanitizeProjectTitleForUser } from "@/lib/display-title";
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
    const ids = Array.from(
      new Set(
        sessions
          .map((row) => (row.project_id || row.session_id || "").trim())
          .filter((id) => id.length > 0)
      )
    );
    const domains = ids.length
      ? await prisma.project.findMany({
          where: { ownerId: guard.data.user.id, id: { in: ids } },
          select: { id: true, subdomain: true }
        })
      : [];
    const subdomainByProjectId = new Map(domains.map((row) => [row.id, row.subdomain]));
    const projects = sessions.map((row) => {
      const sessionId = row.session_id;
      const projectId = row.project_id || row.session_id;
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
        id: projectId,
        name: sanitizeProjectTitleForUser(row.title?.trim() || "") || "Проект",
        subdomain: subdomainByProjectId.get(projectId) ?? null,
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
    name: sanitizeProjectTitleForUser(row.title || "") || "Новый проект",
    subdomain: row.subdomain,
    status: row.updatedAt === row.createdAt ? "Черновик" : "Готов",
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    embedUrl: `/api/sandbox/${row.sandboxId}`,
        editUrl: `/playground/build?sandboxId=${encodeURIComponent(row.sandboxId)}`,
    openUrl: `/api/sandbox/${row.sandboxId}`
  }));

  return Response.json({ projects });
}

async function postProject(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }
  const projectGate = await checkProjectCreationAllowed(guard.data.user.id, guard.data.user.plan);
  if (!projectGate.ok) {
    return new Response(projectGate.message, { status: projectGate.status });
  }
  const body = (await req.json().catch(() => null)) as { name?: string; subdomain?: string } | null;
  const projectId = crypto.randomUUID();
  const name = sanitizeProjectTitleForUser(body?.name?.trim() || "") || "New project";
  const subdomain =
    typeof body?.subdomain === "string" && body.subdomain.trim()
      ? normalizeProjectSubdomain(body.subdomain)
      : undefined;
  const project = await upsertProjectCell({
    projectId,
    ownerId: guard.data.user.id,
    name,
    subdomain
  });
  return Response.json({
    project: {
      id: project.projectId,
      name: project.name,
      subdomain: project.subdomain,
      createdAt: project.createdAt.toISOString()
    }
  });
}

export const GET = withApiLogging("/api/projects", getProjects);
export const POST = withApiLogging("/api/projects", postProject);
