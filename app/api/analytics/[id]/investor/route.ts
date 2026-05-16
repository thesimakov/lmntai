import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { buildInvestorPrompt } from "@/lib/investor-prompt";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { investorReportSchema } from "@/lib/investor-schema";
import { chargeTokensSafely } from "@/lib/token-billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INVESTOR_MODEL = "anthropic/claude-sonnet-4.5";

const RETRY_MESSAGE =
  "Your response was not valid JSON or did not match the required schema. " +
  "Return ONLY the JSON object, no markdown, no code fences. " +
  "Ensure vcPitch has 10 slides, boardReport has 14 slides, dueDiligence has 8 slides.";

function tryParseReport(text: string): ReturnType<typeof investorReportSchema.safeParse> | null {
  try {
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();
    const parsed = JSON.parse(jsonText) as unknown;
    return investorReportSchema.safeParse(parsed);
  } catch {
    return null;
  }
}

class AICallError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "AICallError";
  }
}

async function callInvestorAI(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  userId: string,
  projectId: string
) {
  try {
    const result = await requestRouterAIJson({
      messages,
      model: INVESTOR_MODEL,
      settings: { temperature: 0.1, max_completion_tokens: 8000 },
      user: userId,
    });
    if (result.usage) {
      await chargeTokensSafely({
        userId,
        projectId,
        usage: result.usage,
        model: result.model ?? INVESTOR_MODEL,
      });
    }
    return result;
  } catch (err) {
    throw new AICallError(err);
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireDbUser();
    if (!guard.ok) return apiGuardError(guard);
    const user = guard.data.user;

    const { id: projectId } = await params;

    try {
      await requireProjectScopeForOwner(projectId, user.id);
    } catch (err) {
      if (err instanceof Error && err.message === "PROJECT_NOT_FOUND") {
        return apiError("Project not found or access denied", 403);
      }
      throw err;
    }

    const state = await getSandboxProjectState(projectId);
    if (!state) return apiError("No analysis found. Upload and analyze a PDF first.", 400);
    const rawAnalysis = state.files["analysis.json"];
    if (!rawAnalysis) return apiError("No analysis found. Upload and analyze a PDF first.", 400);

    let dashboard: ReturnType<typeof analysisDashboardSchema.parse>;
    try {
      dashboard = analysisDashboardSchema.parse(JSON.parse(rawAnalysis));
    } catch {
      return apiError("Analysis data is corrupted.", 422);
    }

    const messages = buildInvestorPrompt(dashboard);

    // First attempt
    let result1: Awaited<ReturnType<typeof callInvestorAI>>;
    try {
      result1 = await callInvestorAI(messages, user.id, projectId);
    } catch {
      return apiError("AI service temporarily unavailable", 502);
    }
    const v1 = tryParseReport(result1.text);

    if (v1?.success) {
      const reportWithTimestamp = { ...v1.data, generatedAt: new Date().toISOString() };
      const freshState1 = await getSandboxProjectState(projectId);
      const freshFiles1 = freshState1?.files ?? {};
      await upsertSandboxProjectState({
        projectId,
        sandboxId: state.sandboxId,
        ownerId: user.id,
        title: state.title,
        html: state.html,
        files: { ...freshFiles1, "investor.json": JSON.stringify(reportWithTimestamp) },
      });
      return apiOk({ report: reportWithTimestamp });
    }

    // Retry once with corrective prompt
    const retryMessages = [
      ...messages,
      { role: "assistant" as const, content: result1.text },
      { role: "user" as const, content: RETRY_MESSAGE },
    ];
    let result2: Awaited<ReturnType<typeof callInvestorAI>>;
    try {
      result2 = await callInvestorAI(retryMessages, user.id, projectId);
    } catch {
      return apiError("AI service temporarily unavailable", 502);
    }
    const v2 = tryParseReport(result2.text);

    if (!v2?.success) {
      return apiError("AI response did not match expected schema after retry. Please try again.", 422);
    }

    const reportWithTimestamp = { ...v2.data, generatedAt: new Date().toISOString() };
    const freshState2 = await getSandboxProjectState(projectId);
    const freshFiles2 = freshState2?.files ?? {};
    await upsertSandboxProjectState({
      projectId,
      sandboxId: state.sandboxId,
      ownerId: user.id,
      title: state.title,
      html: state.html,
      files: { ...freshFiles2, "investor.json": JSON.stringify(reportWithTimestamp) },
    });

    return apiOk({ report: reportWithTimestamp });
  } catch (err) {
    console.error("[analytics/investor] unexpected error:", err);
    return apiError("Failed to generate investor report", 500);
  }
}
