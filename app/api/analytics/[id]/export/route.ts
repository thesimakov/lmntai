import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiFile, apiServerError } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { investorReportSchema } from "@/lib/investor-schema";
import { forecastReportSchema } from "@/lib/forecast-schema";
import { buildAnalysisPptx } from "@/lib/analytics-pptx-export";
import { buildForecastPptx } from "@/lib/forecast-pptx-export";
import {
  buildVcPitchPptx,
  buildBoardReportPptx,
  buildDueDiligencePptx,
} from "@/lib/investor-pptx-export";
import { resolveUiLanguageFromRequest } from "@/lib/request-ui-language";
import type { UiLanguage } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const exportBodySchema = z.object({
  format: z.enum(["pptx", "investor-vc-pptx", "investor-board-pptx", "investor-dd-pptx", "forecast-pptx"]),
  /** Резерв: дашборд с клиента, если snapshot на диске отстаёт от Prisma. */
  dashboard: analysisDashboardSchema.optional(),
  /** Резерв: investor-отчёт с клиента после генерации в UI. */
  investorReport: investorReportSchema.optional(),
  /** Резерв: прогноз с клиента после генерации в UI. */
  forecastReport: forecastReportSchema.optional(),
});

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

function resolveAnalysisRaw(files: Record<string, string>, lang: UiLanguage): string | undefined {
  return files[`analysis.${lang}.json`] ?? files["analysis.json"];
}

function safeExportBasename(companyName: string, period: string): string {
  const company = (companyName || "Report").replace(/\s+/g, "_");
  const periodPart = (period || "export").replace(/\s+/g, "_");
  return `${company}_${periodPart}`;
}

function pptxResponse(buffer: Buffer, filename: string): Response {
  return apiFile(buffer, filename, PPTX_MIME);
}

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
  const {
    format,
    dashboard: dashboardFromBody,
    investorReport: investorFromBody,
    forecastReport: forecastFromBody,
  } = bodyResult.data;
  const uiLanguage = resolveUiLanguageFromRequest(req);

  const state = await getSandboxProjectState(projectId);
  const files = state?.files ?? {};

  let dashboard = dashboardFromBody;
  if (!dashboard) {
    const rawDashboard = resolveAnalysisRaw(files, uiLanguage);
    if (!rawDashboard) return apiError("No analysis found", 404);
    try {
      dashboard = analysisDashboardSchema.parse(JSON.parse(rawDashboard));
    } catch {
      return apiError("Analysis data is corrupted.", 422);
    }
  }

  const baseFilename = safeExportBasename(dashboard.meta.companyName, dashboard.meta.period);

  try {
    if (format === "pptx") {
      const buffer = await buildAnalysisPptx(dashboard, uiLanguage);
      return pptxResponse(buffer, `${baseFilename}.pptx`);
    }

    if (format === "forecast-pptx") {
      let forecastReport = forecastFromBody;
      if (!forecastReport) {
        const rawForecast = files["forecast.json"];
        if (!rawForecast) {
          return apiError("Forecast not generated yet. Click 'Generate Forecast' first.", 400);
        }
        try {
          forecastReport = forecastReportSchema.parse(JSON.parse(rawForecast));
        } catch {
          return apiError("Forecast data is corrupted.", 422);
        }
      }
      const buffer = await buildForecastPptx(forecastReport, dashboard, uiLanguage);
      return pptxResponse(buffer, `${baseFilename}_Forecast.pptx`);
    }

    let report = investorFromBody;
    if (!report) {
      const rawInvestor = files["investor.json"];
      if (!rawInvestor) {
        return apiError("Investor report not generated yet. Click 'Generate Investor Report' first.", 400);
      }
      try {
        report = investorReportSchema.parse(JSON.parse(rawInvestor));
      } catch {
        return apiError("Investor report data is corrupted.", 422);
      }
    }

    if (format === "investor-vc-pptx") {
      const buffer = await buildVcPitchPptx(report, dashboard, uiLanguage);
      return pptxResponse(buffer, `${baseFilename}_VC_Pitch.pptx`);
    }

    if (format === "investor-board-pptx") {
      const buffer = await buildBoardReportPptx(report, dashboard, uiLanguage);
      return pptxResponse(buffer, `${baseFilename}_Board_Report.pptx`);
    }

    const buffer = await buildDueDiligencePptx(report, dashboard, uiLanguage);
    return pptxResponse(buffer, `${baseFilename}_Due_Diligence.pptx`);
  } catch (e) {
    return apiServerError(e, "analytics/export");
  }
}
