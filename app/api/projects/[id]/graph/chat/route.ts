import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { componentGraphSchema } from "@/lib/component-graph/schema";
import { renderComponentGraph } from "@/lib/component-graph/renderer";
import {
  applyPatches,
  buildGraphChatPrompt,
  graphPatchResponseSchema,
  GRAPH_CHAT_RETRY_MESSAGE,
} from "@/lib/component-graph/patch";
import {
  chargeStructuredJsonUsageSafely,
  requestStructuredJsonForProjectKind,
} from "@/lib/structured-json-ai";
import { userFacingAiUnavailableMessage } from "@/lib/ai-unavailable-message";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(messageSchema).max(20).default([]),
});

function tryParsePatch(text: string) {
  try {
    let json = text.trim();
    const fence = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) json = fence[1].trim();
    const parsed = JSON.parse(json) as unknown;
    // Allow patches: [] for question-only responses by temporarily relaxing min
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      "patches" in parsed &&
      Array.isArray((parsed as { patches: unknown }).patches) &&
      (parsed as { patches: unknown[] }).patches.length === 0
    ) {
      return { success: true as const, data: { message: (parsed as { message: string }).message, patches: [] } };
    }
    return graphPatchResponseSchema.safeParse(parsed);
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
  const { message, history } = body.data;

  const state = await getSandboxProjectState(projectId);
  const graphJson = state?.files?.["component_graph.json"];
  if (!graphJson) {
    return apiError("No ComponentGraph found. Generate the site first.", 400);
  }

  const graphParse = componentGraphSchema.safeParse(JSON.parse(graphJson));
  if (!graphParse.success) {
    return apiError("Stored graph is invalid. Regenerate the site.", 400);
  }
  const graph = graphParse.data;

  const messages = buildGraphChatPrompt(graph, history ?? [], message);

  async function callAI(
    msgs: Array<{ role: "system" | "user" | "assistant"; content: string }>
  ) {
    const result = await requestStructuredJsonForProjectKind(
      {
        messages: msgs,
        settings: { temperature: 0.2, max_completion_tokens: 4000 },
      },
      { plan: user.plan, projectKind: "website", userId: user.id }
    );
    await chargeStructuredJsonUsageSafely({
      userId: user.id,
      projectId,
      usage: result.usage,
      model: result.model ?? result.requestedModel,
      label: "graph/chat",
    });
    return result;
  }

  let result1: Awaited<ReturnType<typeof callAI>>;
  try {
    result1 = await callAI(messages);
  } catch (e) {
    console.error("[graph/chat]", unknownToErrorMessage(e));
    return apiError(userFacingAiUnavailableMessage(e), 502, { code: "AI_UNAVAILABLE" });
  }

  const v1 = tryParsePatch(result1.text);
  if (!v1?.success) {
    const retryMessages = [
      ...messages,
      { role: "assistant" as const, content: result1.text },
      { role: "user" as const, content: GRAPH_CHAT_RETRY_MESSAGE },
    ];
    let result2: Awaited<ReturnType<typeof callAI>>;
    try {
      result2 = await callAI(retryMessages);
    } catch (e) {
      console.error("[graph/chat] retry", unknownToErrorMessage(e));
      return apiError(userFacingAiUnavailableMessage(e), 502, { code: "AI_UNAVAILABLE" });
    }
    const v2 = tryParsePatch(result2.text);
    if (!v2?.success) {
      return apiError("AI response did not match expected format. Please try again.", 422);
    }
    return applyAndSave(v2.data);
  }

  return applyAndSave(v1.data);

  async function applyAndSave(patchResponse: { message: string; patches: { nodeId: string; props?: Record<string, unknown>; styles?: Record<string, unknown>; label?: string }[] }) {
    const updatedGraph =
      patchResponse.patches.length > 0
        ? applyPatches(graph, patchResponse.patches)
        : graph;

    if (patchResponse.patches.length > 0) {
      const html = renderComponentGraph(updatedGraph);
      const freshState = await getSandboxProjectState(projectId);
      await upsertSandboxProjectState({
        projectId,
        sandboxId: state!.sandboxId,
        ownerId: user.id,
        title: state!.title,
        html,
        files: {
          ...(freshState?.files ?? {}),
          "component_graph.json": JSON.stringify(updatedGraph, null, 2),
        },
      });
    }

    return apiOk({
      message: patchResponse.message,
      patched: patchResponse.patches.length > 0,
      graph: updatedGraph,
    });
  }
}
