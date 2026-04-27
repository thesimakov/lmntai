import { describe, expect, it } from "vitest";

import { resolveAgentForTask } from "@/lib/agent-models";

describe("agent routing integration", () => {
  it("routes website/presentation/resume to distinct pro agents", () => {
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

    expect(website.modelId).not.toBe(presentation.modelId);
    expect(presentation.modelId).not.toBe(resume.modelId);
    expect(website.modelId).toBe("anthropic/claude-sonnet-4.5");
    expect(presentation.modelId).toBe("google/gemini-3.1-pro-preview");
    expect(resume.modelId).toBe("openai/gpt-4.1");
  });

  it("defaults prompt-builder questions to DeepSeek", () => {
    const freeQuestions = resolveAgentForTask({
      plan: "FREE",
      projectKind: "website",
      task: "prompt-questions"
    });
    const proQuestions = resolveAgentForTask({
      plan: "PRO",
      projectKind: "website",
      task: "prompt-questions"
    });

    expect(freeQuestions.modelId).toBe("deepseek/deepseek-v4-flash");
    expect(proQuestions.modelId).toBe("deepseek/deepseek-v4-flash");
  });
});
