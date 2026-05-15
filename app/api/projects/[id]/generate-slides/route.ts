import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { buildSlideGraphPrompt, SLIDE_GRAPH_RETRY_MESSAGE } from "@/lib/slide-graph/prompt";
import { slideGraphSchema } from "@/lib/slide-graph/schema";
import { renderSlideGraph } from "@/lib/slide-graph/renderer";
import { chargeTokensSafely } from "@/lib/token-billing";

const SLIDE_MODEL = "anthropic/claude-sonnet-4-7";

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
});

function tryParseSlideGraph(text: string) {
  try {
    let json = text.trim();
    const fence = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) json = fence[1].trim();
    return slideGraphSchema.safeParse(JSON.parse(json));
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

  const messages = buildSlideGraphPrompt(prompt);

  async function callAI(msgs: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
    const result = await requestRouterAIJson({
      messages: msgs,
      model: SLIDE_MODEL,
      settings: { temperature: 0.4, max_completion_tokens: 8000 },
      user: user.id,
    });
    if (result.usage) {
      await chargeTokensSafely({
        userId: user.id,
        projectId,
        usage: result.usage,
        model: result.model ?? SLIDE_MODEL,
      });
    }
    return result;
  }

  let result1: Awaited<ReturnType<typeof callAI>>;
  try {
    result1 = await callAI(messages);
  } catch {
    return apiError("AI сервис временно недоступен", 502);
  }

  const v1 = tryParseSlideGraph(result1.text);
  if (!v1?.success) {
    const retryMessages = [
      ...messages,
      { role: "assistant" as const, content: result1.text },
      { role: "user" as const, content: SLIDE_GRAPH_RETRY_MESSAGE },
    ];
    let result2: Awaited<ReturnType<typeof callAI>>;
    try {
      result2 = await callAI(retryMessages);
    } catch {
      return apiError("AI сервис временно недоступен", 502);
    }
    const v2 = tryParseSlideGraph(result2.text);
    if (!v2?.success) {
      return apiError("AI response did not match expected schema after retry. Please try again.", 422);
    }
    return saveGraph(v2.data);
  }

  return saveGraph(v1.data);

  async function saveGraph(graph: import("@/lib/slide-graph/types").SlideGraph) {
    const now = new Date().toISOString();
    const finalGraph = { ...graph, meta: { ...graph.meta, generatedAt: now } };
    const html = renderSlideGraph(finalGraph);
    const existing = await getSandboxProjectState(projectId);
    await upsertSandboxProjectState({
      projectId,
      sandboxId: existing?.sandboxId ?? projectId,
      ownerId: user.id,
      title: existing?.title ?? graph.meta.title,
      html,
      files: {
        ...(existing?.files ?? {}),
        "slide_graph.json": JSON.stringify(finalGraph, null, 2),
      },
    });
    return apiOk({ graph: finalGraph, html });
  }
}
