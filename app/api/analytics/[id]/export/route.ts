import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiFile } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema, type AnalysisDashboard } from "@/lib/analytics-schema";
import { investorReportSchema } from "@/lib/investor-schema";
import { forecastReportSchema, type ForecastReport } from "@/lib/forecast-schema";
import { normalizeForecastReport } from "@/lib/forecast-report-normalize";
import { buildAnalysisPptx } from "@/lib/analytics-pptx-export";
import { buildForecastPptx } from "@/lib/forecast-pptx-export";
import {
  buildVcPitchPptx,
  buildBoardReportPptx,
  buildDueDiligencePptx,
} from "@/lib/investor-pptx-export";
import { resolveUiLanguageFromRequest } from "@/lib/request-ui-language";
import type { UiLanguage } from "@/lib/i18n";
import { getProjectBrandKit } from "@/lib/project-brand-kit-service";
import { readProjectBrandKitAsset } from "@/lib/project-brand-kit-storage";
import { sanitizePptxBrandAssets, type PptxBrandAssets } from "@/lib/pptx-sanitize";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";

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

function parseForecastReport(raw: unknown): ForecastReport {
  const strict = forecastReportSchema.safeParse(raw);
  if (strict.success) return strict.data;
  const repaired = normalizeForecastReport(raw);
  if (repaired) return repaired;
  throw new Error("Forecast data is corrupted.");
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

  const brandKit = await getProjectBrandKit(projectId);
  let pptxBrand: PptxBrandAssets | undefined;
  if (brandKit) {
    const primaryHex = brandKit.manifest.colors[0]?.hex;
    const accentHex = brandKit.manifest.colors[1]?.hex;
    let logoData: PptxBrandAssets["logoData"] | undefined;
    const logo = brandKit.manifest.logos[0];
    if (logo?.fileName) {
      const buf = await readProjectBrandKitAsset(projectId, logo.fileName);
      if (buf) {
        const mime = logo.fileName.endsWith(".png") ? "image/png"
          : logo.fileName.endsWith(".webp") ? "image/webp"
          : "image/jpeg";
        logoData = { base64: buf.toString("base64"), mime };
      }
    }
    pptxBrand = sanitizePptxBrandAssets({ primaryHex, accentHex, logoData });
  }

  let dashboard: AnalysisDashboard;
  try {
    if (dashboardFromBody) {
      dashboard = analysisDashboardSchema.parse(dashboardFromBody);
    } else {
      const rawDashboard = resolveAnalysisRaw(files, uiLanguage);
      if (!rawDashboard) return apiError("No analysis found", 404);
      dashboard = analysisDashboardSchema.parse(JSON.parse(rawDashboard));
    }
  } catch {
    return apiError("Analysis data is corrupted.", 422);
  }

  const baseFilename = safeExportBasename(dashboard.meta.companyName, dashboard.meta.period);

  try {
    if (format === "pptx") {
      const buffer = await buildAnalysisPptx(dashboard, uiLanguage, pptxBrand ?? undefined);
      return pptxResponse(buffer, `${baseFilename}.pptx`);
    }

    if (format === "forecast-pptx") {
      let forecastReport: ForecastReport;
      try {
        if (forecastFromBody) {
          forecastReport = parseForecastReport(forecastFromBody);
        } else {
          const rawForecast = files["forecast.json"];
          if (!rawForecast) {
            return apiError("Forecast not generated yet. Click 'Generate Forecast' first.", 400);
          }
          forecastReport = parseForecastReport(JSON.parse(rawForecast));
        }
      } catch {
        return apiError("Forecast data is corrupted.", 422);
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
    const detail = unknownToErrorMessage(e);
    console.error("[analytics/export]", detail);
    return apiError(
      process.env.NODE_ENV === "development"
        ? `Export failed: ${detail}`
        : "Failed to generate export. Check analysis data and brand kit assets.",
      500,
      { code: "ANALYTICS_EXPORT_FAILED" }
    );
  }
}
