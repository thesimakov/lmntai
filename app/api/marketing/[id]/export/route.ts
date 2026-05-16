import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiFile } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { marketingDashboardSchema } from "@/lib/marketing-schema";
import { buildMarketingPptx } from "@/lib/marketing-pptx-export";
import { resolveUiLanguageFromRequest } from "@/lib/request-ui-language";

const exportBodySchema = z.object({
  format: z.literal("marketing-pptx"),
});

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

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

  const bodyResult = await parseBody(req, exportBodySchema);
  if (!bodyResult.ok) return bodyResult.response;
  const uiLanguage = resolveUiLanguageFromRequest(req);

  const state = await getSandboxProjectState(projectId);
  if (!state) return apiError("No analysis found", 404);

  const localizedKey = `marketing.${uiLanguage}.json`;
  const raw = state.files[localizedKey] ?? state.files["marketing.json"];
  if (!raw) return apiError("No analysis found", 404);

  let report: ReturnType<typeof marketingDashboardSchema.parse>;
  try {
    report = marketingDashboardSchema.parse(JSON.parse(raw));
  } catch {
    return apiError("Marketing data is corrupted.", 422);
  }

  const buffer = await buildMarketingPptx(report, uiLanguage);
  const filename = `${report.meta.companyName.replace(/\s+/g, "_")}_${report.meta.period.replace(/\s+/g, "_")}_Marketing.pptx`;
  return apiFile(buffer, filename, PPTX_MIME);
}
