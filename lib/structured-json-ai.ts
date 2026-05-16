import { resolveAgentForTask } from "@/lib/agent-models";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import {
  requestRouterAIJsonWithFallback,
  type RouterAIPayload,
  type RouterAIJsonResult,
} from "@/lib/routerai-client";

/** Known-good RouterAI models when the primary agent model is unavailable. */
const STRUCTURED_JSON_FALLBACK_MODELS = [
  "anthropic/claude-sonnet-4.5",
  "google/gemini-3.1-pro-preview",
  "openai/gpt-4.1",
  "deepseek/deepseek-v4-flash",
] as const;

function buildModelChain(primary: string): string[] {
  const seen = new Set<string>();
  const chain: string[] = [];
  for (const model of [primary, ...STRUCTURED_JSON_FALLBACK_MODELS]) {
    if (seen.has(model)) continue;
    seen.add(model);
    chain.push(model);
  }
  return chain;
}

/**
 * JSON-structured generation for website (ComponentGraph) and presentation (SlideGraph) builders.
 * Uses plan-aware default agent + fallback chain instead of a single hardcoded model id.
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
  const modelChain = buildModelChain(agent.modelId);
  return requestRouterAIJsonWithFallback(
    { ...payload, settings, user: input.userId },
    modelChain
  );
}
