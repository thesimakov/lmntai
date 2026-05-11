import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { formatBuildTemplateBlock, getBuildTemplateBySlug } from "@/lib/build-templates";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { checkProjectCreationAllowed } from "@/lib/project-limits";
import { sandboxManager } from "@/lib/sandbox-manager";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function postBuildTemplatePreview(req: NextRequest) {
  try {
    const guard = await requireDbUser();
    if (!guard.ok) {
      return apiGuardError(guard);
    }

    let body: { slug?: string; projectId?: string };
    try {
      body = (await req.json()) as { slug?: string; projectId?: string };
    } catch {
      return apiError("Invalid JSON", 400);
    }

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const requestedProjectId = typeof body.projectId === "string" ? body.projectId.trim() : "";

    let resolvedProject = null as Awaited<ReturnType<typeof resolveProjectFromRequest>>;
    try {
      resolvedProject = await resolveProjectFromRequest(req);
    } catch {
      resolvedProject = null;
    }

    /** На поддомене публикации проект фиксируется Host + middleware; тело запроса может ещё содержать временный UUID до ответа `/api/projects/current` — не отклоняем такой запрос. */
    const projectId = resolvedProject?.id ?? requestedProjectId;

    if (!slug) {
      return apiError("slug required", 400);
    }
    if (!projectId) {
      return apiError("project_id required", 400);
    }

    const t = await getBuildTemplateBySlug(slug);
    if (!t) {
      return apiError("Template not found", 404);
    }

    try {
      const alreadyOwned = await sandboxManager.canAccess(projectId, guard.data.user.id);
      if (!alreadyOwned) {
        const projectGate = await checkProjectCreationAllowed(guard.data.user.id, guard.data.user.plan);
        if (!projectGate.ok) {
          return apiError(projectGate.message, projectGate.status);
        }
      }

      let sandboxId = projectId;
      if (!alreadyOwned) {
        ({ sandboxId } = await sandboxManager.createSandbox(`bt-${t.slug}`, guard.data.user.id, projectId));
      } else {
        await sandboxManager.ensureSandboxStateForOwnedProject(projectId, guard.data.user.id);
      }

      const generatedTxt = formatBuildTemplateBlock(t.rules, t.files);
      const { previewUrl } = await sandboxManager.applyLovableFromProjectFiles(sandboxId, t.files, generatedTxt);

      return Response.json({ previewUrl, sandboxId });
    } catch (e) {
      return apiError(unknownToErrorMessage(e), 502);
    }
  } catch (e) {
    return Response.json({ error: unknownToErrorMessage(e) }, { status: 502 });
  }
}

export const POST = withApiLogging("/api/build-templates/preview", postBuildTemplatePreview);
