import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import type { MessageKey } from "@/lib/i18n";
import { normalizePlanId, type PlanId } from "@/lib/plan-config";

export type AgentUiLabel =
  | "Kimi K2.6"
  | "Gemini 3 Pro"
  | "GPT-4.1"
  | "Claude Sonnet 4.5"
  | "Claude Haiku 4.5"
  | "Claude Opus 4.6"
  | "DeepSeek";

/** Режим «Авто» в селекторе чата: модель выбирается на сервере по тексту и оценке объёма. */
export type AgentPickerLabel = AgentUiLabel | "Auto";

export type AgentTask =
  | "generate-stream"
  | "prompt-questions"
  | "prompt-compose"
  | "prompt-coach";

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
  /** Подпись в селекторе чата; иначе показывается `uiLabel`. */
  displayLabelKey?: MessageKey;
  /** Карточка модели у провайдера (RouterAI и т.п.). */
  providerModelDocsUrl?: string;
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
    proOnly: false,
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
  "Claude Sonnet 4.5": {
    uiLabel: "Claude Sonnet 4.5",
    modelId: "anthropic/claude-sonnet-4.5",
    proOnly: true,
    settings: {
      stream: { temperature: 0.35, top_p: 0.9, max_completion_tokens: 8_192 },
      json: { temperature: 0.2, top_p: 0.85, max_completion_tokens: 1_600 }
    }
  },
  "Claude Haiku 4.5": {
    uiLabel: "Claude Haiku 4.5",
    modelId: "anthropic/claude-haiku-4.5",
    proOnly: true,
    settings: {
      stream: { temperature: 0.4, top_p: 0.9, max_completion_tokens: 8_192 },
      json: { temperature: 0.25, top_p: 0.9, max_completion_tokens: 2_048 }
    }
  },
  "Claude Opus 4.6": {
    uiLabel: "Claude Opus 4.6",
    modelId: "anthropic/claude-opus-4.6",
    proOnly: true,
    settings: {
      stream: { temperature: 0.3, top_p: 0.9, max_completion_tokens: 8_192 },
      json: { temperature: 0.15, top_p: 0.85, max_completion_tokens: 1_600 }
    }
  },
  /**
   * RouterAI (`https://routerai.ru/api/v1`, OpenAI SDK): model `deepseek/deepseek-v4-flash`.
   * Карточка: https://routerai.ru/models/deepseek/deepseek-v4-flash
   */
  DeepSeek: {
    uiLabel: "DeepSeek",
    modelId: "deepseek/deepseek-v4-flash",
    proOnly: false,
    displayLabelKey: "playground_chat_brand",
    providerModelDocsUrl: "https://routerai.ru/models/deepseek/deepseek-v4-flash",
    settings: {
      stream: { temperature: 0.45, top_p: 0.9, max_completion_tokens: 8_192 },
      json: { temperature: 0.25, top_p: 0.9, max_completion_tokens: 2_048 }
    }
  }
};

const PROJECT_KIND_DEFAULTS_PRO: Record<ProjectKind, AgentUiLabel> = {
  website: "Claude Sonnet 4.5",
  presentation: "Gemini 3 Pro",
  resume: "GPT-4.1",
  design: "Gemini 3 Pro",
  visitcard: "GPT-4.1",
  lovable: "Claude Sonnet 4.5"
};

const PROJECT_KIND_DEFAULTS_FREE: Record<ProjectKind, AgentUiLabel> = {
  website: "GPT-4.1",
  presentation: "Gemini 3 Pro",
  resume: "GPT-4.1",
  design: "Gemini 3 Pro",
  visitcard: "GPT-4.1",
  lovable: "Gemini 3 Pro"
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

/** Грубая оценка входных токенов (~4 символа на токен). */
export function estimateRoughInputTokens(text: string): number {
  return Math.max(0, Math.ceil(text.length / 4));
}

/**
 * Эвристика «Авто»: объём (оценка токенов), тип задачи, тариф, сигналы кода/рассуждений.
 * Не вызывает сеть; детерминировано на сервере.
 */
export function pickAutomaticAgentUiLabel(input: {
  plan: PlanId;
  projectKind: ProjectKind;
  task: AgentTask;
  promptText: string;
}): AgentUiLabel {
  const { plan, projectKind, task, promptText } = input;
  const isPro = plan !== "FREE";
  const t = promptText.toLowerCase();
  const est = estimateRoughInputTokens(promptText);

  const longContext = est > 6_000 || promptText.length > 24_000;

  const codeHeavy =
    /\b(refactor|architecture|typescript|react|vite|debug|stack trace|exception|sql|oauth|crypto|security|xss|csp|webpack|eslint)\b/i.test(
      promptText
    ) || promptText.includes("```");

  const reasoningHeavy =
    /\b(почему|зачем|why|how does|докажи|prove|анализ|analyze|сравни|compare|оптимиз|optimize|алгоритм|algorithm|edge case)\b/i.test(
      t
    );

  const docKind = projectKind === "presentation" || projectKind === "resume";

  let picked: AgentUiLabel;

  if (task === "prompt-questions" || task === "prompt-compose" || task === "prompt-coach") {
    if (!isPro) {
      if (longContext) picked = "Gemini 3 Pro";
      else if (codeHeavy || reasoningHeavy) picked = "GPT-4.1";
      else picked = "DeepSeek";
    } else {
      if (longContext) picked = "Gemini 3 Pro";
      else if (reasoningHeavy || (codeHeavy && projectKind === "lovable")) picked = "Claude Sonnet 4.5";
      else if (est < 2_500 && !codeHeavy && !reasoningHeavy) picked = "Claude Haiku 4.5";
      else picked = "GPT-4.1";
    }
  } else {
    // generate-stream
    if (!isPro) {
      if (longContext) {
        picked = docKind ? "Gemini 3 Pro" : "Kimi K2.6";
      } else if (codeHeavy && projectKind === "lovable") {
        picked = "Gemini 3 Pro";
      } else {
        picked = defaultAgentByPlanAndKind(plan, projectKind);
      }
    } else if (longContext) {
      picked = docKind ? "Gemini 3 Pro" : "Kimi K2.6";
    } else if (reasoningHeavy) {
      picked = "Claude Sonnet 4.5";
    } else if (codeHeavy && projectKind === "lovable") {
      picked = "Claude Sonnet 4.5";
    } else if (est < 2_000 && !codeHeavy) {
      picked = "Claude Haiku 4.5";
    } else {
      picked = defaultAgentByPlanAndKind(plan, projectKind);
    }
  }

  if (!canUseAgent(plan, picked)) {
    return defaultAgentByPlanAndKind(plan, projectKind);
  }
  return picked;
}

export function formatAgentModelDisplayLabel(
  label: AgentPickerLabel,
  t: (key: MessageKey) => string
): string {
  if (label === "Auto") return t("playground_agent_auto");
  const profile = AGENT_PROFILES[label];
  return profile.displayLabelKey ? t(profile.displayLabelKey) : profile.uiLabel;
}

export function getAgentModelDocsUrl(label: AgentPickerLabel): string | undefined {
  if (label === "Auto") return undefined;
  return AGENT_PROFILES[label].providerModelDocsUrl;
}

export function parseAgentUiLabel(raw: string | null | undefined): AgentUiLabel | null {
  if (!raw) return null;
  if (raw === "Claude Sonnet") return "Claude Sonnet 4.5";
  if (
    raw === "Kimi K2.6" ||
    raw === "Gemini 3 Pro" ||
    raw === "GPT-4.1" ||
    raw === "Claude Sonnet 4.5" ||
    raw === "Claude Haiku 4.5" ||
    raw === "Claude Opus 4.6" ||
    raw === "DeepSeek"
  ) {
    return raw;
  }
  return null;
}

export function parseAgentPickerLabel(raw: string | null | undefined): AgentPickerLabel | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^auto$/i.test(trimmed)) return "Auto";
  return parseAgentUiLabel(trimmed);
}

export function resolveAgentForTask(input: {
  plan: string | null | undefined;
  projectKind?: ProjectKind | null;
  task: AgentTask;
  hint?: string | null;
  /** Текст запроса пользователя для режима Авто (`hint: Auto`). */
  autoFromPrompt?: string | null;
}): AgentProfile {
  const plan = normalizePlanId(input.plan);
  const kind = fallbackKind(input.projectKind);
  const picker = parseAgentPickerLabel(input.hint ?? null);
  const autoText = input.autoFromPrompt ?? "";

  if (picker === "Auto") {
    const picked = pickAutomaticAgentUiLabel({
      plan,
      projectKind: kind,
      task: input.task,
      promptText: autoText
    });
    return AGENT_PROFILES[picked];
  }

  if (picker && canUseAgent(plan, picker)) {
    return AGENT_PROFILES[picker];
  }

  // Промпт, коуч и сборка вопросов — по умолчанию DeepSeek (RouterAI deepseek-v4-flash), пока нет явного hint.
  if (
    input.task === "prompt-questions" ||
    input.task === "prompt-coach" ||
    input.task === "prompt-compose"
  ) {
    if (canUseAgent(plan, "DeepSeek")) {
      return AGENT_PROFILES["DeepSeek"];
    }
    if (input.task === "prompt-questions") {
      return AGENT_PROFILES["GPT-4.1"];
    }
    return AGENT_PROFILES[defaultAgentByPlanAndKind(plan, kind)];
  }

  const defaultAgent = defaultAgentByPlanAndKind(plan, kind);
  return AGENT_PROFILES[defaultAgent];
}

export type AgentOptionRow = {
  label: AgentPickerLabel;
  proOnly: boolean;
  available: boolean;
  recommended: boolean;
};

export function getAgentOptionsForUi(input: {
  plan: string | null | undefined;
  projectKind?: ProjectKind | null;
  task: AgentTask;
}): AgentOptionRow[] {
  const plan = normalizePlanId(input.plan);
  const resolved = resolveAgentForTask({
    plan,
    projectKind: input.projectKind,
    task: input.task
  });

  const DEFAULT_PICKER_MODEL: AgentUiLabel = "DeepSeek";

  const rows: AgentOptionRow[] = (Object.keys(AGENT_PROFILES) as AgentUiLabel[]).map((label) => ({
    label,
    proOnly: AGENT_PROFILES[label].proOnly,
    available: canUseAgent(plan, label),
    recommended: label === DEFAULT_PICKER_MODEL
  }));

  rows.unshift({
    label: "Auto",
    proOnly: false,
    available: true,
    recommended: false
  });

  const PRIMARY_LIST_AGENT: AgentUiLabel = "DeepSeek";

  const byAvailability = (a: AgentOptionRow, b: AgentOptionRow) => {
    if (a.available !== b.available) return a.available ? -1 : 1;

    const aAuto = a.label === "Auto";
    const bAuto = b.label === "Auto";
    if (aAuto !== bAuto) return aAuto ? -1 : 1;

    const aPrimary = a.label === PRIMARY_LIST_AGENT;
    const bPrimary = b.label === PRIMARY_LIST_AGENT;
    if (aPrimary !== bPrimary) return aPrimary ? -1 : 1;

    const aMatch = a.label === resolved.uiLabel;
    const bMatch = b.label === resolved.uiLabel;
    if (aMatch !== bMatch) return aMatch ? -1 : 1;

    if (typeof a.label === "string" && typeof b.label === "string") {
      return a.label.localeCompare(b.label, "ru");
    }
    return 0;
  };

  return [...rows].sort(byAvailability);
}
