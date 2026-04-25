import { randomUUID } from "node:crypto";

import {
  createPlanPrompt,
  executeUiPrompt,
  fallbackPlan,
  normalizeArtifactKind,
  summarizePrompt,
  truncateHtmlForRevision,
  type BuilderPlan
} from "./prompts.js";
import { requestJsonCompletion, streamChatCompletion } from "./routerai.js";
import type { BuilderEvent } from "./types.js";

/** История диалога для планировщика / презентаций (только message-события). */
export function formatBuilderTranscript(events: BuilderEvent[], maxChars: number): string {
  const parts: string[] = [];
  for (const e of events) {
    if (e.event !== "message" || !e.data) continue;
    const roleRaw = e.data.role;
    const role = roleRaw === "assistant" ? "Assistant" : "User";
    const content = typeof e.data.content === "string" ? e.data.content.trim() : "";
    if (!content) continue;
    parts.push(`${role}: ${content}`);
  }
  const full = parts.join("\n\n");
  if (full.length <= maxChars) return full;
  return `…(earlier messages truncated)\n\n${full.slice(full.length - maxChars)}`;
}

type Emit = (event: string, data: Record<string, unknown>) => void;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function makeEvent(event: string, data: Record<string, unknown> = {}): BuilderEvent {
  return {
    event,
    data: {
      event_id: randomUUID(),
      timestamp: nowSeconds(),
      ...data
    }
  };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? trimmed;
}

function parsePlan(text: string, message: string): BuilderPlan {
  try {
    const raw = JSON.parse(stripCodeFence(text)) as Partial<BuilderPlan> & { artifactKind?: unknown };
    const steps = Array.isArray(raw.steps)
      ? raw.steps
          .map((s, index) => ({
            id: typeof s?.id === "string" && s.id.trim() ? s.id.trim() : String(index + 1),
            description:
              typeof s?.description === "string" && s.description.trim()
                ? s.description.trim()
                : `Step ${index + 1}`
          }))
          .slice(0, 8)
      : [];
    if (!steps.length) return fallbackPlan(message);
    const artifact_kind = normalizeArtifactKind(raw.artifact_kind ?? raw.artifactKind, message);
    const fb = fallbackPlan(message);
    return {
      message: typeof raw.message === "string" ? raw.message : "",
      language: typeof raw.language === "string" ? raw.language : /[\u0400-\u04FF]/.test(message) ? "ru" : "en",
      goal: typeof raw.goal === "string" && raw.goal.trim() ? raw.goal.trim() : fb.goal,
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 120) : fb.title,
      artifact_kind,
      steps
    };
  } catch {
    return fallbackPlan(message);
  }
}

export function extractHtmlArtifact(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || text.trim();
  const doctypeIndex = candidate.toLowerCase().indexOf("<!doctype html");
  if (doctypeIndex >= 0) return candidate.slice(doctypeIndex).trim();
  const htmlIndex = candidate.toLowerCase().indexOf("<html");
  if (htmlIndex >= 0) return `<!doctype html>\n${candidate.slice(htmlIndex).trim()}`;
  return [
    "<!doctype html>",
    "<html lang=\"ru\">",
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Lemnity Preview</title></head>",
    "<body>",
    candidate,
    "</body>",
    "</html>"
  ].join("\n");
}

export async function createPlan(input: {
  message: string;
  model: string;
  user?: string;
  sessionContext?: { transcript: string; priorHtmlExcerpt: string | null };
}): Promise<BuilderPlan> {
  const text = await requestJsonCompletion({
    model: input.model,
    prompt: createPlanPrompt({ message: input.message, sessionContext: input.sessionContext }),
    user: input.user
  });
  return parsePlan(text, input.message);
}

export async function generateSummary(input: {
  message: string;
  model: string;
  plan: BuilderPlan;
  user?: string;
}): Promise<string> {
  const text = await requestJsonCompletion({
    model: input.model,
    prompt: summarizePrompt({ message: input.message, plan: input.plan }),
    user: input.user
  }).catch(() => "");
  return text.trim() || (input.plan.language === "ru"
    ? "Готово: визуальное превью собрано и доступно справа."
    : "Done: the visual preview is ready on the right.");
}

export async function executePlanToHtml(input: {
  message: string;
  model: string;
  plan: BuilderPlan;
  user?: string;
  emit: Emit;
  /** HTML прошлой сборки — итеративное обновление. */
  priorHtml?: string | null;
}): Promise<string> {
  let html = "";
  const prompt = executeUiPrompt({
    message: input.message,
    plan: input.plan,
    priorHtml: input.priorHtml ? truncateHtmlForRevision(input.priorHtml) : null
  });
  const mainStep = input.plan.steps.find((s) => /html|preview|интерфейс|превью|design/i.test(s.description)) ?? input.plan.steps[input.plan.steps.length - 1];
  if (mainStep) {
    input.emit("step", {
      id: mainStep.id,
      description: mainStep.description,
      status: "running"
    });
  }
  input.emit("tool", {
    tool_call_id: randomUUID(),
    name: "file",
    status: "calling",
    function: "artifact_generate",
    args: { file: "index.html" }
  });

  for await (const chunk of streamChatCompletion({
    model: input.model,
    prompt,
    user: input.user
  })) {
    html += chunk;
    input.emit("delta", { content: chunk, kind: "artifact" });
  }

  input.emit("tool", {
    tool_call_id: randomUUID(),
    name: "file",
    status: "called",
    function: "artifact_generate",
    args: { file: "index.html" }
  });
  if (mainStep) {
    input.emit("step", {
      id: mainStep.id,
      description: mainStep.description,
      status: "completed"
    });
  }
  return extractHtmlArtifact(html);
}
