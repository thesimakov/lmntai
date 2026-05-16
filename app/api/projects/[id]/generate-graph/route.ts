import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { buildComponentGraphPrompt, COMPONENT_GRAPH_RETRY_MESSAGE } from "@/lib/component-graph/prompt";
import { componentGraphSchema } from "@/lib/component-graph/schema";
import { renderComponentGraph } from "@/lib/component-graph/renderer";
import type { ComponentGraph } from "@/lib/component-graph/types";
import {
  chargeStructuredJsonUsageSafely,
  requestStructuredJsonForProjectKind,
} from "@/lib/structured-json-ai";
import { userFacingAiUnavailableMessage } from "@/lib/ai-unavailable-message";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
});

function tryParseGraph(text: string) {
  try {
    let json = text.trim();
    const fence = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) json = fence[1].trim();
    return componentGraphSchema.safeParse(JSON.parse(json));
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
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

  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;
  const { prompt } = body.data;

  const messages = buildComponentGraphPrompt(prompt);

  async function callAI(
    msgs: Array<{ role: "system" | "user" | "assistant"; content: string }>
  ) {
    const result = await requestStructuredJsonForProjectKind(
      {
        messages: msgs,
        settings: { temperature: 0.3, max_completion_tokens: 8000 },
      },
      { plan: user.plan, projectKind: "website", userId: user.id }
    );
    await chargeStructuredJsonUsageSafely({
      userId: user.id,
      projectId,
      usage: result.usage,
      model: result.model ?? result.requestedModel,
      label: "generate-graph",
    });
    return result;
  }

  async function saveGraph(graph: ComponentGraph) {
    const now = new Date().toISOString();
    const finalGraph = { ...graph, meta: { ...graph.meta, generatedAt: now } };
    const html = renderComponentGraph(finalGraph);
    const existing = await getSandboxProjectState(projectId);
    await upsertSandboxProjectState({
      projectId,
      sandboxId: existing?.sandboxId ?? projectId,
      ownerId: user.id,
      title: existing?.title ?? graph.meta.projectName,
      html,
      files: {
        ...(existing?.files ?? {}),
        "component_graph.json": JSON.stringify(finalGraph, null, 2),
      },
    });
    return apiOk({ graph: finalGraph, html });
  }

  let result1: Awaited<ReturnType<typeof callAI>>;
  try {
    result1 = await callAI(messages);
  } catch (e) {
    console.error("[generate-graph]", unknownToErrorMessage(e));
    return apiError(userFacingAiUnavailableMessage(e), 502, { code: "AI_UNAVAILABLE" });
  }

  const v1 = tryParseGraph(result1.text);
  if (v1?.success) {
    return saveGraph(v1.data);
  }

  const retryMessages = [
    ...messages,
    { role: "assistant" as const, content: result1.text },
    { role: "user" as const, content: COMPONENT_GRAPH_RETRY_MESSAGE },
  ];

  let result2: Awaited<ReturnType<typeof callAI>>;
  try {
    result2 = await callAI(retryMessages);
  } catch (e) {
    console.error("[generate-graph] retry", unknownToErrorMessage(e));
    return apiError(userFacingAiUnavailableMessage(e), 502, { code: "AI_UNAVAILABLE" });
  }

  const v2 = tryParseGraph(result2.text);
  if (!v2?.success) {
    return apiError(
      "AI response did not match expected schema after retry. Please try again.",
      422
    );
  }

  return saveGraph(v2.data);
}
