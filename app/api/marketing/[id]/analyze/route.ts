import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { buildMarketingPrompt } from "@/lib/marketing-prompt";
import { marketingDashboardSchema, type MarketingDashboard } from "@/lib/marketing-schema";
import { chargeTokensSafely } from "@/lib/token-billing";

const MARKETING_MODEL = "anthropic/claude-sonnet-4.5";
const MAX_RAW_CHARS = 200_000;

const RETRY_MESSAGE =
  "Your response was not valid JSON or did not match the required schema. " +
  "Return ONLY the JSON object, no markdown, no code fences. " +
  "Ensure channels array has 1–6 items.";

function tryParseDashboard(text: string): ReturnType<typeof marketingDashboardSchema.safeParse> | null {
  try {
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();
    return marketingDashboardSchema.safeParse(JSON.parse(jsonText));
  } catch {
    return null;
  }
}

export async function POST(
  _req: NextRequest,
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
  const rawText = state?.files?.["marketing_raw.txt"];
  if (!rawText) {
    return apiError("No data uploaded. Upload CSV/XLSX/PDF files first.", 400);
  }

  const truncated =
    rawText.length > MAX_RAW_CHARS
      ? rawText.slice(0, MAX_RAW_CHARS) + "\n\n[Data truncated — first 200k characters shown]"
      : rawText;

  const messages = buildMarketingPrompt(truncated);

  // state is non-null here: the !rawText guard above proves state?.files existed
  const nonNullState = state!;

  async function saveReport(data: MarketingDashboard) {
    const report = { ...data, meta: { ...data.meta, analyzedAt: new Date().toISOString() } };
    const freshState = await getSandboxProjectState(projectId);
    await upsertSandboxProjectState({
      projectId,
      sandboxId: nonNullState.sandboxId,
      ownerId: user.id,
      title: nonNullState.title,
      html: nonNullState.html,
      files: { ...(freshState?.files ?? {}), "marketing.json": JSON.stringify(report) },
    });
    return apiOk({ report });
  }

  async function callAI(msgs: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
    const result = await requestRouterAIJson({
      messages: msgs,
      model: MARKETING_MODEL,
      settings: { temperature: 0.1, max_completion_tokens: 8000 },
      user: user.id,
    });
    if (result.usage) {
      await chargeTokensSafely({
        userId: user.id,
        projectId,
        usage: result.usage,
        model: result.model ?? MARKETING_MODEL,
      });
    }
    return result;
  }

  let result1: Awaited<ReturnType<typeof callAI>>;
  try {
    result1 = await callAI(messages);
  } catch {
    return apiError("AI service temporarily unavailable", 502);
  }

  const v1 = tryParseDashboard(result1.text);
  if (v1?.success) {
    return saveReport(v1.data);
  }

  const retryMessages = [
    ...messages,
    { role: "assistant" as const, content: result1.text },
    { role: "user" as const, content: RETRY_MESSAGE },
  ];

  let result2: Awaited<ReturnType<typeof callAI>>;
  try {
    result2 = await callAI(retryMessages);
  } catch {
    return apiError("AI service temporarily unavailable", 502);
  }

  const v2 = tryParseDashboard(result2.text);
  if (!v2?.success) {
    return apiError("AI response did not match expected schema after retry. Please try again.", 422);
  }

  return saveReport(v2.data);
}
