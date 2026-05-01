import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { formatBuildTemplateBlock, getBuildTemplateBySlug } from "@/lib/build-templates";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { checkProjectCreationAllowed } from "@/lib/project-limits";
import { sandboxManager } from "@/lib/sandbox-manager";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function postBuildTemplatePreview(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return Response.json({ error: guard.message }, { status: guard.status });
  }

  let body: { slug?: string; projectId?: string };
  try {
    body = (await req.json()) as { slug?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const requestedProjectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
  const resolvedProject = await resolveProjectFromRequest(req);
  if (resolvedProject && requestedProjectId && requestedProjectId !== resolvedProject.id) {
    return Response.json({ error: "Project mismatch for current domain" }, { status: 404 });
  }
  const projectId = resolvedProject?.id ?? requestedProjectId;
  if (!slug) {
    return Response.json({ error: "slug required" }, { status: 400 });
  }
  if (!projectId) {
    return Response.json({ error: "project_id required" }, { status: 400 });
  }

  const t = await getBuildTemplateBySlug(slug);
  if (!t) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  try {
    const alreadyOwned = await sandboxManager.canAccess(projectId, guard.data.user.id);
    if (!alreadyOwned) {
      const projectGate = await checkProjectCreationAllowed(guard.data.user.id, guard.data.user.plan);
      if (!projectGate.ok) {
        return Response.json({ error: projectGate.message }, { status: projectGate.status });
      }
    }
    const { sandboxId } = alreadyOwned
      ? { sandboxId: projectId }
      : await sandboxManager.createSandbox(`bt-${t.slug}`, guard.data.user.id, projectId);
    const generatedTxt = formatBuildTemplateBlock(t.rules, t.files);
    const { previewUrl } = await sandboxManager.applyLovableFromProjectFiles(sandboxId, t.files, generatedTxt);

    return Response.json({ previewUrl, sandboxId });
  } catch (e) {
    return Response.json({ error: unknownToErrorMessage(e) }, { status: 502 });
  }
}

export const POST = withApiLogging("/api/build-templates/preview", postBuildTemplatePreview);
