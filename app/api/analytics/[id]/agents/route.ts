/**
 * POST /api/analytics/[id]/agents
 *
 * Multi-agent orchestration: runs Financial Analyst, BI Insight, and Schema Mapping
 * agents in parallel and merges their outputs into a unified insights object.
 */
import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { chargeTokensSafely } from "@/lib/token-billing";
import { retrieveRelevantChunks } from "@/lib/text-rag";
import { resolveUiLanguageFromRequest } from "@/lib/request-ui-language";

const AGENT_MODEL = "anthropic/claude-haiku-4.5";

type AgentResult = {
  agent: string;
  output: string;
  ok: boolean;
};

async function runAgent(
  agentName: string,
  systemPrompt: string,
  userContent: string,
  userId: string,
  projectId: string
): Promise<AgentResult> {
  try {
    const result = await requestRouterAIJson({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      model: AGENT_MODEL,
      settings: { temperature: 0.2, max_completion_tokens: 1500 },
      user: userId,
    });
    if (result.usage) {
      await chargeTokensSafely({
        userId,
        projectId,
        usage: result.usage,
        model: result.model ?? AGENT_MODEL,
      });
    }
    return { agent: agentName, output: result.text, ok: true };
  } catch (err) {
    return {
      agent: agentName,
      output: err instanceof Error ? err.message : "Agent failed",
      ok: false,
    };
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;
  const uiLanguage = resolveUiLanguageFromRequest(req);
  const outputLanguage = uiLanguage === "en" ? "English" : uiLanguage === "tg" ? "Tajik" : "Russian";

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

  const rawText = state.files["raw_text.txt"] ?? "";
  const topChunks = rawText ? retrieveRelevantChunks(rawText, "financial metrics risk opportunity", 3) : [];
  const docContext = topChunks.length > 0
    ? `\n\nSource document excerpts:\n${topChunks.join("\n---\n")}`
    : "";

  const dashboardSummary = JSON.stringify({
    meta: dashboard.meta,
    summary: dashboard.summary,
    kpis: dashboard.kpis,
  }, null, 2);

  const sharedContext = `${dashboardSummary}${docContext}`;

  // Run all three agents in parallel
  const [financialResult, biResult, schemaResult] = await Promise.all([
    runAgent(
      "Financial Analyst",
      `You are an expert CFO-level financial analyst. Given a structured financial analysis,
provide a deep dive into: EBITDA health, margin trends, burn rate, runway, unit economics,
and operational leverage. Identify the 3 most critical financial signals.
Be specific, use exact numbers from the data. Max 300 words. Use bullet points.
Write output in ${outputLanguage}.`,
      `Analyze this financial data:\n\n${sharedContext}`,
      user.id,
      projectId
    ),

    runAgent(
      "BI Insight",
      `You are a business intelligence specialist. Given financial data,
identify cross-metric correlations, benchmark against typical SaaS/startup metrics,
and surface non-obvious insights. Focus on: growth efficiency, cohort health signals,
leading vs lagging indicators. Provide 3-5 actionable BI insights. Max 300 words.
Write output in ${outputLanguage}.`,
      `Find BI insights in this data:\n\n${sharedContext}`,
      user.id,
      projectId
    ),

    runAgent(
      "Schema Mapping",
      `You are a data schema expert. Given financial data, identify:
1. What data model/schema this document follows (P&L, balance sheet, SaaS metrics, etc.)
2. What key fields are missing that would improve the analysis
3. What data sources could enrich this dataset (e.g., Stripe, QuickBooks, CRM)
4. Confidence level of the extracted metrics (HIGH/MEDIUM/LOW) with reasoning.
Max 250 words. Be structured.
Write output in ${outputLanguage}.`,
      `Map the schema for this financial data:\n\n${sharedContext}`,
      user.id,
      projectId
    ),
  ]);

  const results: AgentResult[] = [financialResult, biResult, schemaResult];
  const agentInsights = {
    generatedAt: new Date().toISOString(),
    agents: results.map((r) => ({
      name: r.agent,
      ok: r.ok,
      output: r.output,
    })),
  };

  // Persist agent insights
  const freshState = await getSandboxProjectState(projectId);
  await upsertSandboxProjectState({
    projectId,
    sandboxId: state.sandboxId,
    ownerId: user.id,
    title: state.title,
    html: state.html,
    files: {
      ...(freshState?.files ?? {}),
      "agent_insights.json": JSON.stringify(agentInsights),
    },
  });

  return apiOk({ insights: agentInsights, data: { insights: agentInsights } });
}
