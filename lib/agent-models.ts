import type { ProjectKind } from "@/lib/manus-prompt-spec";
import { normalizePlanId, type PlanId } from "@/lib/plan-config";

export type AgentUiLabel = "Kimi K2.6" | "Gemini 3 Pro" | "GPT-4.1" | "Claude Sonnet";
export type AgentTask = "generate-stream" | "prompt-questions" | "prompt-compose";

export type RouterAICompletionSettings = {
  temperature?: number;
  top_p?: number;
  max_completion_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
};

export type AgentProfile = {
  uiLabel: AgentUiLabel;
  modelId: string;
  proOnly: boolean;
  settings: {
    stream: RouterAICompletionSettings;
    json: RouterAICompletionSettings;
  };
};

export const AGENT_PROFILES: Record<AgentUiLabel, AgentProfile> = {
  "Kimi K2.6": {
    uiLabel: "Kimi K2.6",
    modelId: "moonshotai/kimi-k2.6",
    proOnly: false,
    settings: {
      stream: { temperature: 0.45, top_p: 0.9, max_completion_tokens: 8_192 },
      json: { temperature: 0.3, top_p: 0.9, max_completion_tokens: 1_600 }
    }
  },
  "Gemini 3 Pro": {
    uiLabel: "Gemini 3 Pro",
    modelId: "google/gemini-3.1-pro-preview",
    proOnly: true,
    settings: {
      stream: { temperature: 0.45, top_p: 0.9, max_completion_tokens: 8_192 },
      json: { temperature: 0.35, top_p: 0.9, max_completion_tokens: 2_048 }
    }
  },
  "GPT-4.1": {
    uiLabel: "GPT-4.1",
    modelId: "openai/gpt-4.1",
    proOnly: false,
    settings: {
      stream: { temperature: 0.4, top_p: 0.95, max_completion_tokens: 8_192 },
      json: { temperature: 0.25, top_p: 0.9, max_completion_tokens: 1_600 }
    }
  },
  "Claude Sonnet": {
    uiLabel: "Claude Sonnet",
    modelId: "anthropic/claude-sonnet-4.6",
    proOnly: true,
    settings: {
      stream: { temperature: 0.35, top_p: 0.9, max_completion_tokens: 8_192 },
      json: { temperature: 0.2, top_p: 0.85, max_completion_tokens: 1_600 }
    }
  }
};

const PROJECT_KIND_DEFAULTS_PRO: Record<ProjectKind, AgentUiLabel> = {
  website: "Claude Sonnet",
  presentation: "Gemini 3 Pro",
  resume: "GPT-4.1",
  design: "Gemini 3 Pro",
  visitcard: "GPT-4.1"
};

const PROJECT_KIND_DEFAULTS_FREE: Record<ProjectKind, AgentUiLabel> = {
  website: "GPT-4.1",
  presentation: "Kimi K2.6",
  resume: "GPT-4.1",
  design: "Kimi K2.6",
  visitcard: "GPT-4.1"
};

function fallbackKind(kind?: ProjectKind | null): ProjectKind {
  return kind ?? "website";
}

function defaultAgentByPlanAndKind(plan: PlanId, kind: ProjectKind): AgentUiLabel {
  if (plan === "FREE") return PROJECT_KIND_DEFAULTS_FREE[kind];
  return PROJECT_KIND_DEFAULTS_PRO[kind];
}

function canUseAgent(plan: PlanId, agent: AgentUiLabel) {
  return plan !== "FREE" || !AGENT_PROFILES[agent].proOnly;
}

export function parseAgentUiLabel(raw: string | null | undefined): AgentUiLabel | null {
  if (
    raw === "Kimi K2.6" ||
    raw === "Gemini 3 Pro" ||
    raw === "GPT-4.1" ||
    raw === "Claude Sonnet"
  ) {
    return raw;
  }
  return null;
}

export function resolveAgentForTask(input: {
  plan: string | null | undefined;
  projectKind?: ProjectKind | null;
  task: AgentTask;
  hint?: string | null;
}): AgentProfile {
  const plan = normalizePlanId(input.plan);
  const kind = fallbackKind(input.projectKind);

  // Questions intentionally stay lightweight for both trial/pro.
  if (input.task === "prompt-questions") {
    return AGENT_PROFILES["GPT-4.1"];
  }

  const defaultAgent = defaultAgentByPlanAndKind(plan, kind);
  const hint = parseAgentUiLabel(input.hint);
  if (hint && hint === defaultAgent && canUseAgent(plan, hint)) {
    return AGENT_PROFILES[hint];
  }
  return AGENT_PROFILES[defaultAgent];
}

export function getAgentOptionsForUi(input: {
  plan: string | null | undefined;
  projectKind?: ProjectKind | null;
  task: AgentTask;
}) {
  const plan = normalizePlanId(input.plan);
  const resolved = resolveAgentForTask({
    plan,
    projectKind: input.projectKind,
    task: input.task
  });

  return (Object.keys(AGENT_PROFILES) as AgentUiLabel[]).map((label) => ({
    label,
    proOnly: AGENT_PROFILES[label].proOnly,
    available: canUseAgent(plan, label),
    recommended: label === resolved.uiLabel
  }));
}
