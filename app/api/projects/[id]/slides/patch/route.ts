/**
 * POST /api/projects/[id]/slides/patch
 *
 * Applies direct visual patches to SlideGraph without AI.
 * Used by the visual slide editor for inline text/style edits.
 */
import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError, apiServerError } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { loadSlideGraphFromJson } from "@/lib/slide-graph/normalize";
import { getTemplate } from "@/lib/slide-graph/templates";
import { applySlidePatchBody, slidePatchBodySchema } from "@/lib/slide-graph/patch";
import { renderSlideGraph } from "@/lib/slide-graph/renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireDbUser();
    if (!guard.ok) return apiGuardError(guard);
    const { user } = guard.data;

    const { id: projectId } = await params;

    try {
      await requireProjectScopeForOwner(projectId, user.id);
    } catch {
      return apiError("Project not found or access denied", 403);
    }

    const body = await parseBody(req, slidePatchBodySchema);
    if (!body.ok) return body.response;

    const state = await getSandboxProjectState(projectId);

    if (body.data.clearAll) {
      if (!state) {
        return apiOk({ cleared: true });
      }
      const files = { ...state.files };
      delete files["slide_graph.json"];
      await upsertSandboxProjectState({
        projectId,
        sandboxId: state.sandboxId ?? projectId,
        ownerId: user.id,
        title: state.title,
        html: "",
        files,
      });
      return apiOk({ cleared: true });
    }

    const graphJson = state?.files?.["slide_graph.json"];
    if (!graphJson) {
      return apiError("No SlideGraph found. Generate the presentation first.", 400);
    }

    let metaTemplateId: string | undefined;
    try {
      const raw = JSON.parse(graphJson) as { meta?: { templateId?: string } };
      metaTemplateId = raw.meta?.templateId;
    } catch {
      return apiError("Stored SlideGraph JSON is invalid.", 422);
    }

    const template = metaTemplateId ? getTemplate(metaTemplateId) : undefined;
    const graphParse = loadSlideGraphFromJson(graphJson, { template });
    if (!graphParse?.success) {
      return apiError("Stored SlideGraph is invalid. Please regenerate.", 422);
    }

    const updatedGraph = applySlidePatchBody(graphParse.data, body.data);
    const html = renderSlideGraph(updatedGraph);

    const freshState = await getSandboxProjectState(projectId);
    await upsertSandboxProjectState({
      projectId,
      sandboxId: state!.sandboxId ?? projectId,
      ownerId: user.id,
      title: state!.title,
      html,
      files: {
        ...(freshState?.files ?? {}),
        "slide_graph.json": JSON.stringify(updatedGraph, null, 2),
      },
    });

    return apiOk({ graph: updatedGraph });
  } catch (e) {
    return apiServerError(e, "slides-patch");
  }
}
