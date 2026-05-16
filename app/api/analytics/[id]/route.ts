import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { resolveUiLanguageFromRequest } from "@/lib/request-ui-language";
import { localizeAnalysisDashboard } from "@/lib/analytics-dashboard-localization";

export async function GET(
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

  const state = await getSandboxProjectState(projectId);
  if (!state) return apiError("No analysis found", 404);

  const lang = resolveUiLanguageFromRequest(req);
  const localizedKey = `analysis.${lang}.json`;
  const raw = state.files[localizedKey] ?? state.files["analysis.json"];
  if (!raw) return apiError("No analysis found", 404);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return apiError("Stored analysis is corrupt", 500);
  }

  const validation = analysisDashboardSchema.safeParse(parsed);
  if (!validation.success) return apiError("Stored analysis is corrupt", 500);

  let dashboard = validation.data;

  if (!state.files[localizedKey] && lang !== "en") {
    try {
      dashboard = await localizeAnalysisDashboard(validation.data, lang, user.id);
      await upsertSandboxProjectState({
        projectId,
        sandboxId: state.sandboxId,
        ownerId: state.ownerId,
        title: state.title,
        html: state.html,
        files: {
          ...state.files,
          [localizedKey]: JSON.stringify(dashboard),
        },
      });
    } catch (err) {
      console.warn("[analytics] localization skipped:", err);
    }
  }

  return apiOk({
    dashboard,
    data: { dashboard },
    hasRawText: !!state.files["raw_text.txt"],
  });
}
