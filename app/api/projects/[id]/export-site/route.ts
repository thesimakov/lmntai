/**
 * GET /api/projects/[id]/export-site
 *
 * Downloads the generated website as a ZIP containing index.html.
 * For ComponentGraph projects re-renders from the graph JSON.
 * For legacy projects uses the stored HTML string.
 */
import type { NextRequest } from "next/server";
import JSZip from "jszip";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { componentGraphSchema } from "@/lib/component-graph/schema";
import { renderComponentGraph } from "@/lib/component-graph/renderer";

export const runtime = "nodejs";

export async function GET(
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
  if (!state) return apiError("No site generated yet.", 404);

  let html: string;

  const graphJson = state.files?.["component_graph.json"];
  if (graphJson) {
    const parse = componentGraphSchema.safeParse(JSON.parse(graphJson));
    if (!parse.success) return apiError("ComponentGraph data is invalid. Regenerate the site.", 422);
    html = renderComponentGraph(parse.data);
  } else if (state.html?.trim()) {
    html = state.html;
  } else {
    return apiError("No site HTML found. Generate the site first.", 404);
  }

  const zip = new JSZip();
  zip.file("index.html", html);

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  const safeName = (state.title ?? "site").replace(/[^a-z0-9_\-]/gi, "_").slice(0, 60) || "site";

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
