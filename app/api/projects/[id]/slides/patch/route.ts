/**
 * POST /api/projects/[id]/slides/patch
 *
 * Applies direct visual patches to SlideGraph without AI.
 * Used by the visual slide editor for inline text/style edits.
 */
import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { slideGraphSchema } from "@/lib/slide-graph/schema";
import { slidePatchSchema, applySlidePatches } from "@/lib/slide-graph/patch";
import { renderSlideGraph } from "@/lib/slide-graph/renderer";
import { z } from "zod";

const bodySchema = z.object({
  patches: z.array(slidePatchSchema).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const { id: projectId } = await params;

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch {
    return apiError("Project not found or access denied", 403);
  }

  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;
  const { patches } = body.data;

  const state = await getSandboxProjectState(projectId);
  const graphJson = state?.files?.["slide_graph.json"];
  if (!graphJson) {
    return apiError("No SlideGraph found. Generate the presentation first.", 400);
  }

  const graphParse = slideGraphSchema.safeParse(JSON.parse(graphJson));
  if (!graphParse.success) {
    return apiError("Stored SlideGraph is invalid. Please regenerate.", 422);
  }

  const updatedGraph = applySlidePatches(graphParse.data, patches);
  const html = renderSlideGraph(updatedGraph);

  const freshState = await getSandboxProjectState(projectId);
  await upsertSandboxProjectState({
    projectId,
    sandboxId: state.sandboxId,
    ownerId: user.id,
    title: state.title,
    html,
    files: {
      ...(freshState?.files ?? {}),
      "slide_graph.json": JSON.stringify(updatedGraph, null, 2),
    },
  });

  return apiOk({ graph: updatedGraph });
}
