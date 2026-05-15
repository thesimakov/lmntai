/**
 * GET /api/analytics/shared/[token]
 *
 * Public endpoint — returns analytics data filtered by share role.
 * viewer   → dashboard only
 * investor → dashboard + investor_report.json
 * analyst  → dashboard + investor + forecast + benchmark
 */
import { type NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { getAnalyticsShareByToken, isShareExpired } from "@/lib/analytics-share-db";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const share = await getAnalyticsShareByToken(token);
  if (!share) return apiError("Share link not found", 404);
  if (isShareExpired(share)) return apiError("This share link has expired", 410);

  const state = await getSandboxProjectState(share.projectId);
  if (!state?.files?.["analysis.json"]) {
    return apiError("No analytics data available", 404);
  }

  const files = state.files;
  const role = share.role;

  // Parse core dashboard
  let dashboard: unknown = null;
  try {
    dashboard = JSON.parse(files["analysis.json"]);
  } catch {
    return apiError("Dashboard data is corrupted", 422);
  }

  const response: Record<string, unknown> = {
    role,
    shareLabel: share.label,
    dashboard,
  };

  // Investor and above: investor deck
  if (role === "investor" || role === "analyst") {
    if (files["investor_report.json"]) {
      try { response.investorReport = JSON.parse(files["investor_report.json"]); } catch { /* skip */ }
    }
  }

  // Analyst only: forecast + benchmark
  if (role === "analyst") {
    if (files["forecast.json"]) {
      try { response.forecast = JSON.parse(files["forecast.json"]); } catch { /* skip */ }
    }
    if (files["benchmark_report.json"]) {
      try { response.benchmarkReport = JSON.parse(files["benchmark_report.json"]); } catch { /* skip */ }
    }
    if (files["agent_insights.json"]) {
      try { response.agentInsights = JSON.parse(files["agent_insights.json"]); } catch { /* skip */ }
    }
  }

  return apiOk(response);
}
