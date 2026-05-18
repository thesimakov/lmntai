import { type NextRequest } from "next/server";
import { z } from "zod";
import { parseAgentPickerLabel } from "@/lib/agent-models";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { loadSlideGraphFromJson } from "@/lib/slide-graph/normalize";
import { buildSlideChatPrompt, SLIDE_CHAT_RETRY_MESSAGE } from "@/lib/slide-graph/prompt";
import {
  slideChatResponseSchema,
  slideChatResponseToPatchBody,
  applySlidePatchBody,
} from "@/lib/slide-graph/patch";
import { renderSlideGraph } from "@/lib/slide-graph/renderer";
import { getTemplate } from "@/lib/slide-graph/templates";
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
  agentHint: z.string().max(64).optional(),
});

function tryParseChatResponse(text: string) {
  try {
    let json = text.trim();
    const fence = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) json = fence[1].trim();
    const parsed = JSON.parse(json) as unknown;
    return slideChatResponseSchema.safeParse(parsed);
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
  const { message, history, agentHint: agentHintRaw } = body.data;
  const agentHint = parseAgentPickerLabel(agentHintRaw) ?? agentHintRaw ?? null;

  const state = await getSandboxProjectState(projectId);
  const graphJson = state?.files?.["slide_graph.json"];
  if (!graphJson) {
    return apiError("No SlideGraph found. Generate the presentation first.", 400);
  }

  let metaTemplateId: string | undefined;
  try {
    const raw = JSON.parse(graphJson) as { meta?: { templateId?: string } };
    metaTemplateId = raw.meta?.templateId;
  } catch {
    return apiError("Stored SlideGraph is invalid. Please regenerate.", 422);
  }

  const template = metaTemplateId ? getTemplate(metaTemplateId) : undefined;
  const graphParse = loadSlideGraphFromJson(graphJson, { template });
  if (!graphParse?.success) {
    return apiError("Stored SlideGraph is invalid. Please regenerate.", 422);
  }

  const graph = graphParse.data;
  const messages = buildSlideChatPrompt(graph, history ?? [], message);

  async function callAI(msgs: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
    const result = await requestStructuredJsonForProjectKind(
      {
        messages: msgs,
        settings: { temperature: 0.2, max_completion_tokens: 4000 },
      },
      {
        plan: user.plan,
        projectKind: "presentation",
        userId: user.id,
        agentHint,
        autoFromPrompt: message,
      }
    );
    await chargeStructuredJsonUsageSafely({
      userId: user.id,
      projectId,
      usage: result.usage,
      model: result.model ?? result.requestedModel,
      label: "slides/chat",
    });
    return result;
  }

  let result1: Awaited<ReturnType<typeof callAI>>;
  try {
    result1 = await callAI(messages);
  } catch (e) {
    console.error("[slides/chat]", unknownToErrorMessage(e));
    return apiError(userFacingAiUnavailableMessage(e), 502, { code: "AI_UNAVAILABLE" });
  }

  const v1 = tryParseChatResponse(result1.text);
  if (!v1?.success) {
    const retryMessages = [
      ...messages,
      { role: "assistant" as const, content: result1.text },
      { role: "user" as const, content: SLIDE_CHAT_RETRY_MESSAGE },
    ];
    let result2: Awaited<ReturnType<typeof callAI>>;
    try {
      result2 = await callAI(retryMessages);
    } catch (e) {
      console.error("[slides/chat] retry", unknownToErrorMessage(e));
      return apiError(userFacingAiUnavailableMessage(e), 502, { code: "AI_UNAVAILABLE" });
    }
    const v2 = tryParseChatResponse(result2.text);
    if (!v2?.success) {
      return apiError("AI response did not match expected format. Please try again.", 422);
    }
    return applyAndSave(v2.data);
  }

  return applyAndSave(v1.data);

  async function applyAndSave(chatResponse: z.infer<typeof slideChatResponseSchema>) {
    const patchBody = slideChatResponseToPatchBody(chatResponse);
    const updatedGraph = patchBody ? applySlidePatchBody(graph, patchBody) : graph;

    if (patchBody) {
      const html = renderSlideGraph(updatedGraph);
      const freshState = await getSandboxProjectState(projectId);
      await upsertSandboxProjectState({
        projectId,
        sandboxId: state!.sandboxId ?? projectId,
        ownerId: user.id,
        title: state!.title,
        html,
        files: {
          ...(freshState?.files ?? {}),
          "slide_graph.json": JSON.stringify(updatedGraph, null, 2),
        },
      });
    }

    return apiOk({
      message: chatResponse.message,
      patched: Boolean(patchBody),
      graph: updatedGraph,
      model: result1.model ?? result1.requestedModel,
    });
  }
}
