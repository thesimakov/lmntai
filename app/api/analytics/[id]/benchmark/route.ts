/**
 * POST /api/analytics/[id]/benchmark
 *
 * Detects company industry from dashboard, matches KPIs to industry benchmarks,
 * then asks an AI agent to produce a positioning narrative.
 */
import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { chargeTokensSafely } from "@/lib/token-billing";
import { detectIndustry, matchKpiToBenchmarks } from "@/lib/analytics-benchmarks";
import type { BenchmarkComparison } from "@/lib/analytics-benchmarks";
import { persistBenchmarkSamples, getEnrichedIndustryBenchmark, getBenchmarkSampleCount } from "@/lib/benchmark-db";

const BENCHMARK_MODEL = "anthropic/claude-haiku-4.5";

export type BenchmarkReport = {
  generatedAt: string;
  industry: { id: string; name: string };
  comparisons: BenchmarkComparison[];
  narrative: string;
  sampleCount?: number;
};

export async function POST(
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
  if (!state?.files?.["analysis.json"]) {
    return apiError("No analysis found. Upload and analyze a file first.", 400);
  }

  let dashboard: ReturnType<typeof analysisDashboardSchema.parse>;
  try {
    dashboard = analysisDashboardSchema.parse(JSON.parse(state.files["analysis.json"]));
  } catch {
    return apiError("Analysis data is corrupted.", 422);
  }

  // Build a text fingerprint for industry detection
  const fingerprint = [
    dashboard.meta.documentType,
    dashboard.summary.executive,
    ...dashboard.summary.keyFindings,
    ...dashboard.kpis.map((k) => k.label),
    state.files["raw_text.txt"]?.slice(0, 2000) ?? "",
  ].join(" ");

  const industryHardcoded = detectIndustry(fingerprint);

  // Enrich benchmarks with real DB data (falls back gracefully if < 5 samples)
  const industry = await getEnrichedIndustryBenchmark(industryHardcoded.id) ?? industryHardcoded;

  // Build KPI text for numeric extraction
  const kpiText = dashboard.kpis
    .map((k) => `${k.label}: ${k.value}${k.change ? ` (${k.change})` : ""}`)
    .join("\n");

  const comparisons = matchKpiToBenchmarks(kpiText, industry);

  // Persist anonymised samples for future cross-company benchmarking
  await persistBenchmarkSamples(industry.id, comparisons).catch(() => {});

  const sampleCount = await getBenchmarkSampleCount(industry.id).catch(() => 0);

  // AI narrative
  const comparedStr = comparisons
    .map((c) => {
      const val = c.companyValue !== null ? `${c.companyValue}${c.unit}` : "N/A";
      return `- ${c.label}: company=${val}, industry median=${c.median}${c.unit}, status=${c.status}`;
    })
    .join("\n");

  const systemPrompt = `You are a financial benchmarking analyst specializing in ${industry.name} companies.
Given benchmark comparison data, write a 200-250 word positioning assessment covering:
1. Where the company outperforms the industry (top 1-2 strengths)
2. Where the company lags (top 1-2 weaknesses)
3. One strategic recommendation based on the gaps
Be specific with numbers. Use bullet points for the strengths/weaknesses, then a short paragraph for the recommendation.`;

  const userContent = `Company: ${dashboard.meta.companyName}
Industry: ${industry.name}
Period: ${dashboard.meta.period}

Benchmark comparisons:
${comparedStr}

Company KPIs:
${kpiText}`;

  let narrative = "";
  try {
    const result = await requestRouterAIJson({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      model: BENCHMARK_MODEL,
      settings: { temperature: 0.3, max_completion_tokens: 600 },
      user: user.id,
    });
    if (result.usage) {
      await chargeTokensSafely({
        userId: user.id,
        projectId,
        usage: result.usage,
        model: result.model ?? BENCHMARK_MODEL,
      });
    }
    narrative = result.text;
  } catch {
    narrative = "Benchmark narrative unavailable.";
  }

  const report: BenchmarkReport = {
    generatedAt: new Date().toISOString(),
    industry: { id: industry.id, name: industry.name },
    comparisons,
    narrative,
    sampleCount,
  };

  // Persist
  const freshState = await getSandboxProjectState(projectId);
  await upsertSandboxProjectState({
    projectId,
    sandboxId: state.sandboxId,
    ownerId: user.id,
    title: state.title,
    html: state.html,
    files: {
      ...(freshState?.files ?? {}),
      "benchmark_report.json": JSON.stringify(report),
    },
  });

  return apiOk({ report, data: { report } });
}
