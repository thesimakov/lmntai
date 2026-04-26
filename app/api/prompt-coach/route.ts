import type { NextRequest } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { requireDbUser } from "@/lib/auth-guards";
import { resolveAgentForTask } from "@/lib/agent-models";
import {
  buildPromptCoachSystemPrompt,
  coachOfflineDemoReply,
  parsePromptCoachJson
} from "@/lib/prompt-coach";
import { buildPromptModelFallbackChain } from "@/lib/prompt-model-fallback";
import { getEffectivePromptBuilderMinimum } from "@/lib/platform-plan-settings";
import { requestRouterAIJsonWithFallback } from "@/lib/routerai-client";
import { chargeTokensSafely, estimateUsageFromText, normalizeUsage } from "@/lib/token-billing";
import { hasEnoughTokens } from "@/lib/token-manager";
import { getProjectKindPromptBuilderContextRu, isProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import { withApiLogging } from "@/lib/with-api-logging";

async function postPromptCoach(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          messages?: Array<{ role?: string; content?: string }>;
          idea?: string;
          projectKind?: string;
          agentHint?: string;
        }
      | null;

    const session = await getSafeServerSession();
    const guard = await requireDbUser();

    const rawMessages = body?.messages ?? [];
    const messages = rawMessages
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
      .map((m) => ({ role: m.role, content: m.content.trim() }))
      .filter((m) => m.content.length > 0);

    if (!messages.length) {
      return new Response("messages must include at least one user or assistant entry", { status: 400 });
    }

    if (!guard.ok) {
      if (
        guard.status === 503 &&
        session?.user?.demoOffline &&
        process.env.NODE_ENV === "development"
      ) {
        const kind = isProjectKind(body?.projectKind) ? body.projectKind : null;
        const demo = coachOfflineDemoReply(messages, kind);
        return Response.json({ ...demo, fallback: true, noDb: true });
      }
      return new Response(guard.message, { status: guard.status });
    }

    const user = guard.data.user;
    const minPromptBalance = await getEffectivePromptBuilderMinimum(user.plan);
    if (!hasEnoughTokens(user, minPromptBalance)) {
      return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
    }

    const idea = body?.idea?.trim() ?? "";
    const kindCtx = isProjectKind(body?.projectKind)
      ? getProjectKindPromptBuilderContextRu(body.projectKind)
      : "";

    const agent = resolveAgentForTask({
      plan: user.plan,
      projectKind: isProjectKind(body?.projectKind) ? body.projectKind : undefined,
      task: "prompt-coach",
      hint: body?.agentHint
    });

    const systemContent = buildPromptCoachSystemPrompt(kindCtx, idea);
    const routerMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemContent },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ];

    const inputDigest = messages.map((m) => `${m.role}:${m.content}`).join("\n");

    try {
      const modelChain = buildPromptModelFallbackChain(agent.modelId);
      const res = await requestRouterAIJsonWithFallback(
        {
          messages: routerMessages,
          settings: agent.settings.json,
          user: user.id
        },
        modelChain
      );
      const text = res.text;
      const usage = res.usage;
      const billedModel = res.model ?? res.requestedModel ?? agent.modelId;
      const debugAttempted = modelChain;

      const parsed = parsePromptCoachJson(text);
      if (!parsed) {
        return Response.json(
          {
            reply:
              "Не удалось разобрать ответ модели. Повтори сообщение или упрости формулировку.",
            phase: "gathering" as const,
            technical_prompt: null,
            fallback: true
          },
          { status: 200 }
        );
      }

      const fallbackUsage = estimateUsageFromText(`${systemContent}\n${inputDigest}`, text);
      const charge = await chargeTokensSafely({
        userId: user.id,
        usage: usage ?? fallbackUsage,
        model: billedModel
      });
      if (!charge.charged && charge.reason === "insufficient_balance") {
        return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
      }

      const usageOut = normalizeUsage(usage ?? fallbackUsage);
      return Response.json({
        ...parsed,
        usage: usageOut,
        ...(process.env.NODE_ENV === "production"
          ? {}
          : {
              debug_model: billedModel,
              debug_attempted_models: debugAttempted
            })
      });
    } catch (err) {
      console.error("[api/prompt-coach] RouterAI", err);
      const kind = isProjectKind(body?.projectKind) ? body.projectKind : null;
      const demo = coachOfflineDemoReply(messages, kind);
      return Response.json({ ...demo, fallback: true });
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[api/prompt-coach]", err);
    return Response.json({ error: detail.slice(0, 500) }, { status: 500 });
  }
}

export const POST = withApiLogging("/api/prompt-coach", postPromptCoach);
