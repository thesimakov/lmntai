import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { loadSlideGraphFromJson } from "@/lib/slide-graph/normalize";
import { getTemplate } from "@/lib/slide-graph/templates";
import { buildSlideGraphPptx } from "@/lib/slide-graph/pptx-export";

export async function POST(
  _req: NextRequest,
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

  const state = await getSandboxProjectState(projectId);
  if (!state?.files?.["slide_graph.json"]) {
    return apiError("No slide graph found. Generate slides first.", 400);
  }

  const graphJson = state.files["slide_graph.json"];
  let metaTemplateId: string | undefined;
  try {
    const raw = JSON.parse(graphJson) as { meta?: { templateId?: string } };
    metaTemplateId = raw.meta?.templateId;
  } catch {
    return apiError("Slide graph data is corrupted.", 422);
  }

  const template = metaTemplateId ? getTemplate(metaTemplateId) : undefined;
  const graphParse = loadSlideGraphFromJson(graphJson, { template });
  if (!graphParse?.success) {
    return apiError("Slide graph data is corrupted.", 422);
  }
  const graph = graphParse.data;

  let pptxBuffer: Buffer;
  try {
    pptxBuffer = await buildSlideGraphPptx(graph);
  } catch (err) {
    console.error("[slides/export] PPTX generation failed:", err instanceof Error ? err.message : err);
    return apiError("Failed to generate PPTX file.", 500);
  }

  const filename = `${graph.meta.title.replace(/[^a-zA-Z0-9а-яА-Я\s_-]/g, "").trim() || "presentation"}.pptx`;

  return new Response(pptxBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(pptxBuffer.length),
    },
  });
}
