import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { isLemnityAiBridgeEnabledServer } from "@/lib/lemnity-ai-bridge-config";
import { listLemnityAiSessionsForUser } from "@/lib/lemnity-ai-session-links";
import { prisma } from "@/lib/prisma";
import { checkProjectCreationAllowed } from "@/lib/project-limits";
import { normalizeProjectSubdomain, upsertProjectCell } from "@/lib/project-context";
import { sanitizeProjectTitleForUser } from "@/lib/display-title";
import {
  buildPlaygroundEditUrlForStoredEditor,
  normalizePreferredPlaygroundEditor,
  parsePreferredPlaygroundEditor
} from "@/lib/playground-project-edit-url";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getProjects(req: NextRequest) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  try {
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
          select: { id: true, subdomain: true, preferredEditor: true }
        })
      : [];
    const subdomainByProjectId = new Map(domains.map((row) => [row.id, row.subdomain]));
    const preferredEditorByProjectId = new Map(
      domains.map((row) => [row.id, normalizePreferredPlaygroundEditor(row.preferredEditor)])
    );
    const aiProjects = sessions.map((row) => {
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
        name: sanitizeProjectTitleForUser(String(row.title ?? "").trim()) || "Проект",
        subdomain: subdomainByProjectId.get(projectId) ?? null,
        status: String(row.status ?? "") || "pending",
        createdAt,
        updatedAt,
        embedUrl,
        editUrl: buildPlaygroundEditUrlForStoredEditor(preferredEditorByProjectId.get(projectId) ?? "build", {
          projectId,
          sessionId
        }),
        openUrl:
          embedUrl ??
          buildPlaygroundEditUrlForStoredEditor(preferredEditorByProjectId.get(projectId) ?? "build", {
            projectId,
            sessionId
          })
      };
    });
    const aiIds = new Set(aiProjects.map((p) => p.id));
    const prismaRows = await prisma.project.findMany({
      where: { ownerId: guard.data.user.id },
      select: { id: true, name: true, subdomain: true, createdAt: true, updatedAt: true, preferredEditor: true }
    });
    const orphanProjects = prismaRows
      .filter((row) => !aiIds.has(row.id))
      .map((row) => {
        const createdAt = row.createdAt.toISOString();
        const updatedAt = row.updatedAt.toISOString();
        const editor = normalizePreferredPlaygroundEditor(row.preferredEditor);
        const editUrl = buildPlaygroundEditUrlForStoredEditor(editor, {
          projectId: row.id,
          preferProjectIdQuery: true
        });
        const openUrl =
          editor === "box"
            ? `/api/sandbox/${encodeURIComponent(row.id)}`
            : `/playground/build?projectId=${encodeURIComponent(row.id)}`;
        return {
          id: row.id,
          name: sanitizeProjectTitleForUser(row.name?.trim() || "") || "Проект",
          subdomain: row.subdomain,
          status: "draft",
          createdAt,
          updatedAt,
          embedUrl: null as string | null,
          editUrl,
          openUrl
        };
      });
    const merged = [...aiProjects, ...orphanProjects].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return Response.json({ projects: merged });
    }

    const rows = await sandboxManager.listSandboxesByOwner(guard.data.user.id);

    const sandboxProjects = rows.map((row) => ({
      id: row.sandboxId,
      name: sanitizeProjectTitleForUser(row.title || "") || "Новый проект",
      subdomain: row.subdomain,
      status: row.updatedAt === row.createdAt ? "Черновик" : "Готов",
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      embedUrl: `/api/sandbox/${row.sandboxId}`,
      editUrl: buildPlaygroundEditUrlForStoredEditor(row.preferredEditor ?? "build", {
        projectId: row.sandboxId
      }),
      openUrl: `/api/sandbox/${row.sandboxId}`
    }));

    return Response.json({ projects: sandboxProjects });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const prismaCode =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : null;
    console.error("[GET /api/projects]", e);
    const schemaHint =
      /column/i.test(msg) ||
      /does not exist/i.test(msg) ||
      /Unknown column/i.test(msg) ||
      /no such column/i.test(msg);
    const errorText = schemaHint
      ? `Схема БД не совпадает с кодом: выполните «npx prisma migrate deploy» и перезапустите сервер. (${msg})`
      : msg;
    return Response.json({ error: errorText, prismaCode }, { status: 500 });
  }
}

async function postProject(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    subdomain?: string;
    preferredEditor?: unknown;
  } | null;

  const projectGate = await checkProjectCreationAllowed(guard.data.user.id, guard.data.user.plan);
  if (!projectGate.ok) {
    return new Response(projectGate.message, { status: projectGate.status });
  }
  const name = sanitizeProjectTitleForUser(body?.name?.trim() || "") || "New project";

  const projectId = crypto.randomUUID();
  const subdomain =
    typeof body?.subdomain === "string" && body.subdomain.trim()
      ? normalizeProjectSubdomain(body.subdomain)
      : undefined;
  const preferredEditor = parsePreferredPlaygroundEditor(body?.preferredEditor);
  const project = await upsertProjectCell({
    projectId,
    ownerId: guard.data.user.id,
    name,
    subdomain,
    ...(preferredEditor ? { preferredEditor } : {})
  });
  return Response.json({
    project: {
      id: project.projectId,
      name: project.name,
      subdomain: project.subdomain,
      preferredEditor: project.preferredEditor,
      createdAt: project.createdAt.toISOString()
    }
  });
}

export const GET = withApiLogging("/api/projects", getProjects);
export const POST = withApiLogging("/api/projects", postProject);
