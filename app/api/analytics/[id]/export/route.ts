import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiFile } from "@/lib/api-response";
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

const exportBodySchema = z.object({
  format: z.enum(["pptx", "investor-vc-pptx", "investor-board-pptx", "investor-dd-pptx", "forecast-pptx"]),
});

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

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
  const { format } = bodyResult.data;

  const state = await getSandboxProjectState(projectId);
  if (!state) return apiError("No analysis found", 404);

  const rawDashboard = state.files["analysis.json"];
  if (!rawDashboard) return apiError("No analysis found", 404);

  let dashboard: ReturnType<typeof analysisDashboardSchema.parse>;
  try {
    dashboard = analysisDashboardSchema.parse(JSON.parse(rawDashboard));
  } catch {
    return apiError("Analysis data is corrupted.", 422);
  }

  const baseFilename = `${dashboard.meta.companyName.replace(/\s+/g, "_")}_${dashboard.meta.period.replace(/\s+/g, "_")}`;

  if (format === "pptx") {
    const buffer = await buildAnalysisPptx(dashboard);
    return pptxResponse(buffer, `${baseFilename}.pptx`);
  }

  // Forecast format — require forecast.json
  if (format === "forecast-pptx") {
    const rawForecast = state.files["forecast.json"];
    if (!rawForecast) {
      return apiError("Forecast not generated yet. Click 'Generate Forecast' first.", 404);
    }

    let forecastReport: ReturnType<typeof forecastReportSchema.parse>;
    try {
      forecastReport = forecastReportSchema.parse(JSON.parse(rawForecast));
    } catch {
      return apiError("Forecast data is corrupted.", 422);
    }

    const buffer = await buildForecastPptx(forecastReport, dashboard);
    return pptxResponse(buffer, `${baseFilename}_Forecast.pptx`);
  }

  // Investor formats — require investor.json
  const rawInvestor = state.files["investor.json"];
  if (!rawInvestor) {
    return apiError("Investor report not generated yet. Click 'Generate Investor Report' first.", 400);
  }

  let report: ReturnType<typeof investorReportSchema.parse>;
  try {
    report = investorReportSchema.parse(JSON.parse(rawInvestor));
  } catch {
    return apiError("Investor report data is corrupted.", 422);
  }

  if (format === "investor-vc-pptx") {
    const buffer = await buildVcPitchPptx(report, dashboard);
    return pptxResponse(buffer, `${baseFilename}_VC_Pitch.pptx`);
  }

  if (format === "investor-board-pptx") {
    const buffer = await buildBoardReportPptx(report, dashboard);
    return pptxResponse(buffer, `${baseFilename}_Board_Report.pptx`);
  }

  // investor-dd-pptx
  const buffer = await buildDueDiligencePptx(report, dashboard);
  return pptxResponse(buffer, `${baseFilename}_Due_Diligence.pptx`);
}
