import type { PresentationTemplate } from "./templates";
import type { SlideGraph } from "./types";
import {
  formatSlideGraphZodIssues,
  parseSlideGraphFromAiText,
  type NormalizeSlideGraphOptions,
} from "./normalize";

export type SlideGraphAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type SlideGraphAiCallSettings = {
  temperature?: number;
  max_completion_tokens?: number;
};

export type SlideGraphAiCallResult = {
  text: string;
};

const MAX_ATTEMPTS = 3;

export type GenerateSlideGraphFromAiInput = {
  messages: SlideGraphAiMessage[];
  template?: PresentationTemplate;
  retryMessage: string;
  logLabel: string;
  callAI: (
    messages: SlideGraphAiMessage[],
    settings: SlideGraphAiCallSettings
  ) => Promise<SlideGraphAiCallResult>;
};

export type GenerateSlideGraphFromAiSuccess = {
  ok: true;
  graph: SlideGraph;
  attempts: number;
};

export type GenerateSlideGraphFromAiFailure = {
  ok: false;
  attempts: number;
  lastSchemaHint: string;
};

export async function generateSlideGraphFromAi(
  input: GenerateSlideGraphFromAiInput
): Promise<GenerateSlideGraphFromAiSuccess | GenerateSlideGraphFromAiFailure> {
  const parseOpts: NormalizeSlideGraphOptions = { template: input.template };
  let messages = [...input.messages];
  let lastSchemaHint = "invalid JSON";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const temperature = attempt === 1 ? 0.45 : attempt === 2 ? 0.25 : 0.1;
    const result = await input.callAI(messages, {
      temperature,
      max_completion_tokens: 16000,
    });

    const parsed = parseSlideGraphFromAiText(result.text, parseOpts);
    if (parsed?.success) {
      return { ok: true, graph: parsed.data, attempts: attempt };
    }

    lastSchemaHint =
      parsed && !parsed.success ? formatSlideGraphZodIssues(parsed.error) : "invalid JSON";
    console.warn(
      `[${input.logLabel}] schema mismatch (attempt ${attempt}/${MAX_ATTEMPTS}):`,
      lastSchemaHint
    );

    if (attempt >= MAX_ATTEMPTS) break;

    messages = [
      ...input.messages,
      { role: "assistant", content: result.text },
      {
        role: "user",
        content: `${input.retryMessage}\n\nValidation errors: ${lastSchemaHint}`,
      },
    ];
  }

  return { ok: false, attempts: MAX_ATTEMPTS, lastSchemaHint };
}
