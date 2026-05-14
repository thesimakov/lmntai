import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { buildAnalysisPptx } from "@/lib/analytics-pptx-export";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const user = guard.data.user;

  const { id: projectId } = await params;

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch {
    return apiError("Project not found or access denied", 403);
  }

  const body = await req.json() as { format: string };
  if (body.format !== "pptx") return apiError("Only pptx format is supported", 400);

  const state = await getSandboxProjectState(projectId);
  if (!state) return apiError("No analysis found", 404);
  const raw = state.files["analysis.json"];
  if (!raw) return apiError("No analysis found", 404);

  let dashboard: ReturnType<typeof analysisDashboardSchema.parse>;
  try {
    dashboard = analysisDashboardSchema.parse(JSON.parse(raw));
  } catch {
    return apiError("Analysis data is corrupted.", 422);
  }

  const buffer = await buildAnalysisPptx(dashboard);
  const filename = `${dashboard.meta.companyName.replace(/\s+/g, "_")}_${dashboard.meta.period.replace(/\s+/g, "_")}.pptx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
