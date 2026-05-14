import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema } from "@/lib/analytics-schema";

export async function GET(
  _req: NextRequest,
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

  const state = await getSandboxProjectState(projectId);
  const raw = state?.files?.["analysis.json"];
  if (!raw) return apiError("No analysis found", 404);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return apiError("Stored analysis is corrupt", 500);
  }

  const validation = analysisDashboardSchema.safeParse(parsed);
  if (!validation.success) return apiError("Stored analysis is corrupt", 500);

  return apiOk({
    dashboard: validation.data,
    hasRawText: !!state.files["raw_text.txt"],
  });
}
