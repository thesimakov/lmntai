import { describe, expect, it } from "vitest";

import {
  getAgentOptionsForUi,
  parseAgentUiLabel,
  resolveAgentForTask
} from "@/lib/agent-models";

describe("agent models catalog", () => {
  it("parses only known UI labels", () => {
    expect(parseAgentUiLabel("GPT-4.1")).toBe("GPT-4.1");
    expect(parseAgentUiLabel("Kimi K2.6")).toBe("Kimi K2.6");
    expect(parseAgentUiLabel("Gemini 3 Pro")).toBe("Gemini 3 Pro");
    expect(parseAgentUiLabel("unknown")).toBeNull();
  });

  it("enforces trial model for FREE plan", () => {
    const website = resolveAgentForTask({
      plan: "FREE",
      projectKind: "website",
      task: "generate-stream",
      hint: "Claude Sonnet"
    });
    expect(website.uiLabel).toBe("GPT-4.1");
  });

  it("honors paid user agent hint when it differs from default", () => {
    const gemini = resolveAgentForTask({
      plan: "PRO",
      projectKind: "website",
      task: "generate-stream",
      hint: "Gemini 3 Pro"
    });
    expect(gemini.uiLabel).toBe("Gemini 3 Pro");

    const kimi = resolveAgentForTask({
      plan: "TEAM",
      projectKind: "website",
      task: "generate-stream",
      hint: "Kimi K2.6"
    });
    expect(kimi.uiLabel).toBe("Kimi K2.6");
  });

  it("uses task-specific defaults for PRO plan", () => {
    const website = resolveAgentForTask({
      plan: "PRO",
      projectKind: "website",
      task: "generate-stream"
    });
    const presentation = resolveAgentForTask({
      plan: "PRO",
      projectKind: "presentation",
      task: "generate-stream"
    });
    const resume = resolveAgentForTask({
      plan: "PRO",
      projectKind: "resume",
      task: "generate-stream"
    });
    const questions = resolveAgentForTask({
      plan: "PRO",
      projectKind: "website",
      task: "prompt-questions"
    });

    expect(website.uiLabel).toBe("Claude Sonnet");
    expect(presentation.uiLabel).toBe("Gemini 3 Pro");
    expect(resume.uiLabel).toBe("GPT-4.1");
    expect(questions.uiLabel).toBe("GPT-4.1");
  });

  it("marks pro models unavailable in trial UI options", () => {
    const options = getAgentOptionsForUi({
      plan: "FREE",
      projectKind: "presentation",
      task: "generate-stream"
    });
    const gemini = options.find((x) => x.label === "Gemini 3 Pro");
    const claude = options.find((x) => x.label === "Claude Sonnet");
    const gpt = options.find((x) => x.label === "GPT-4.1");
    const kimi = options.find((x) => x.label === "Kimi K2.6");

    expect(gemini?.available).toBe(false);
    expect(claude?.available).toBe(false);
    expect(gpt?.available).toBe(true);
    expect(kimi?.available).toBe(true);
    expect(kimi?.recommended).toBe(true);
  });
});
