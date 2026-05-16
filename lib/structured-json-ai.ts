import { resolveAgentForTask } from "@/lib/agent-models";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import { buildPromptModelFallbackChain } from "@/lib/prompt-model-fallback";
import {
  requestRouterAIJsonWithFallback,
  type RouterAIPayload,
  type RouterAIJsonResult,
} from "@/lib/routerai-client";
import { chargeTokensSafely, type TokenUsage } from "@/lib/token-billing";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";

/** Models that work reliably for large JSON outputs on RouterAI (same family as Marketing BI). */
const STRUCTURED_JSON_FALLBACK_MODELS = [
  "anthropic/claude-sonnet-4.5",
  "openai/gpt-4.1",
  "google/gemini-3.1-pro-preview",
  "deepseek/deepseek-v4-flash",
] as const;

function uniqModels(candidates: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of candidates) {
    const model = raw?.trim();
    if (!model || seen.has(model)) continue;
    seen.add(model);
    result.push(model);
  }
  return result;
}

export function buildStructuredJsonModelChain(
  plan: string | null | undefined,
  projectKind: Extract<ProjectKind, "website" | "presentation">
): string[] {
  const agent = resolveAgentForTask({
    plan,
    projectKind,
    task: "generate-stream",
  });
  return uniqModels([
    "anthropic/claude-sonnet-4.5",
    agent.modelId,
    ...STRUCTURED_JSON_FALLBACK_MODELS,
    ...buildPromptModelFallbackChain(agent.modelId),
  ]);
}

/**
 * JSON-structured generation for website (ComponentGraph) and presentation (SlideGraph) builders.
 */
export async function requestStructuredJsonForProjectKind(
  payload: Omit<RouterAIPayload, "model">,
  input: {
    plan: string | null | undefined;
    projectKind: Extract<ProjectKind, "website" | "presentation">;
    userId: string;
  }
): Promise<RouterAIJsonResult & { requestedModel: string; attemptedModels: string[] }> {
  const agent = resolveAgentForTask({
    plan: input.plan,
    projectKind: input.projectKind,
    task: "generate-stream",
  });
  const settings = payload.settings ?? agent.settings.json;
  const modelChain = buildStructuredJsonModelChain(input.plan, input.projectKind);
  return requestRouterAIJsonWithFallback(
    { ...payload, settings, user: input.userId },
    modelChain
  );
}

/** Charge tokens after a successful AI call; never fail the request if billing DB errors. */
export async function chargeStructuredJsonUsageSafely(input: {
  userId: string;
  projectId: string;
  usage: Partial<TokenUsage> | null | undefined;
  model: string;
  label: string;
}): Promise<void> {
  if (!input.usage) return;
  try {
    await chargeTokensSafely({
      userId: input.userId,
      projectId: input.projectId,
      usage: input.usage,
      model: input.model,
    });
  } catch (e) {
    console.error(`[${input.label}] token charge failed`, unknownToErrorMessage(e));
  }
}
