import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { marketingDashboardSchema } from "@/lib/marketing-schema";
import { resolveUiLanguageFromRequest } from "@/lib/request-ui-language";
import { applyMarketingLanguageFallback } from "@/lib/marketing-dashboard-localization";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const user = guard.data.user;

  const { id: projectId } = await params;
  const uiLanguage = resolveUiLanguageFromRequest(req);

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch {
    return apiError("Project not found or access denied", 403);
  }

  const state = await getSandboxProjectState(projectId);
  const localizedKey = `marketing.${uiLanguage}.json`;
  const raw = state?.files?.[localizedKey] ?? state?.files?.["marketing.json"];
  if (!raw) {
    return apiOk({ report: null });
  }
  const nonNullState = state!;

  try {
    let report = marketingDashboardSchema.parse(JSON.parse(raw));
    const localizedReport = applyMarketingLanguageFallback(report, uiLanguage);
    if (JSON.stringify(localizedReport) !== JSON.stringify(report)) {
      report = localizedReport;
      await upsertSandboxProjectState({
        projectId,
        sandboxId: nonNullState.sandboxId,
        ownerId: nonNullState.ownerId,
        title: nonNullState.title,
        html: nonNullState.html,
        files: {
          ...(nonNullState.files ?? {}),
          [localizedKey]: JSON.stringify(report),
        },
      });
    }
    return apiOk({ report });
  } catch {
    return apiOk({ report: null });
  }
}
