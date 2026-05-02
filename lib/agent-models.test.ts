import { describe, expect, it } from "vitest";

import {
  formatAgentModelDisplayLabel,
  getAgentModelDocsUrl,
  getAgentOptionsForUi,
  parseAgentPickerLabel,
  parseAgentUiLabel,
  resolveAgentForTask
} from "@/lib/agent-models";

describe("agent models catalog", () => {
  it("uses i18n-backed display label when set", () => {
    expect(
      formatAgentModelDisplayLabel("DeepSeek", (k) =>
        k === "playground_chat_brand" ? "Lemnity AI" : String(k)
      )
    ).toBe("Lemnity AI");

    expect(formatAgentModelDisplayLabel("GPT-4.1", (k) => String(k))).toBe("GPT-4.1");
  });

  it("formats Auto label via i18n", () => {
    expect(
      formatAgentModelDisplayLabel("Auto", (k) =>
        k === "playground_agent_auto" ? "Авто" : String(k)
      )
    ).toBe("Авто");
  });

  it("lists Auto first, then DeepSeek among available agents", () => {
    const options = getAgentOptionsForUi({
      plan: "FREE",
      projectKind: "website",
      task: "generate-stream"
    });
    const available = options.filter((x) => x.available);
    expect(available[0]?.label).toBe("Auto");
    expect(available[1]?.label).toBe("DeepSeek");
  });

  it("resolves Auto hint from prompt volume and cues", () => {
    const long = "word ".repeat(5000);
    const autoWebsite = resolveAgentForTask({
      plan: "FREE",
      projectKind: "website",
      task: "generate-stream",
      hint: "Auto",
      autoFromPrompt: long
    });
    expect(autoWebsite.uiLabel).toBe("Kimi K2.6");

    const code = "Refactor the React components in src/App.tsx ```tsx```";
    const autoLovable = resolveAgentForTask({
      plan: "FREE",
      projectKind: "lovable",
      task: "generate-stream",
      hint: "AUTO",
      autoFromPrompt: code
    });
    expect(autoLovable.uiLabel).toBe("Gemini 3 Pro");
  });

  it("exposes RouterAI docs URL for DeepSeek profile", () => {
    expect(getAgentModelDocsUrl("DeepSeek")).toBe(
      "https://routerai.ru/models/deepseek/deepseek-v4-flash"
    );
    expect(getAgentModelDocsUrl("GPT-4.1")).toBeUndefined();
  });

  it("parses Auto picker token case-insensitively", () => {
    expect(parseAgentPickerLabel("Auto")).toBe("Auto");
    expect(parseAgentPickerLabel("AUTO")).toBe("Auto");
    expect(parseAgentPickerLabel("GPT-4.1")).toBe("GPT-4.1");
  });

  it("parses only known UI labels", () => {
    expect(parseAgentUiLabel("GPT-4.1")).toBe("GPT-4.1");
    expect(parseAgentUiLabel("Kimi K2.6")).toBe("Kimi K2.6");
    expect(parseAgentUiLabel("Gemini 3 Pro")).toBe("Gemini 3 Pro");
    expect(parseAgentUiLabel("Claude Sonnet")).toBe("Claude Sonnet 4.5");
    expect(parseAgentUiLabel("Claude Sonnet 4.5")).toBe("Claude Sonnet 4.5");
    expect(parseAgentUiLabel("DeepSeek")).toBe("DeepSeek");
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

    expect(website.uiLabel).toBe("Claude Sonnet 4.5");
    expect(presentation.uiLabel).toBe("Gemini 3 Pro");
    expect(resume.uiLabel).toBe("GPT-4.1");
    expect(questions.uiLabel).toBe("DeepSeek");
  });

  it("keeps TEAM defaults aligned with PRO for stream and compose tasks", () => {
    const kinds = ["website", "presentation", "resume", "design", "visitcard"] as const;
    for (const kind of kinds) {
      const proStream = resolveAgentForTask({
        plan: "PRO",
        projectKind: kind,
        task: "generate-stream"
      });
      const teamStream = resolveAgentForTask({
        plan: "TEAM",
        projectKind: kind,
        task: "generate-stream"
      });
      const proCompose = resolveAgentForTask({
        plan: "PRO",
        projectKind: kind,
        task: "prompt-compose"
      });
      const teamCompose = resolveAgentForTask({
        plan: "TEAM",
        projectKind: kind,
        task: "prompt-compose"
      });

      expect(teamStream.modelId).toBe(proStream.modelId);
      expect(teamCompose.modelId).toBe(proCompose.modelId);
    }
  });

  it("marks pro models unavailable in trial UI options", () => {
    const options = getAgentOptionsForUi({
      plan: "FREE",
      projectKind: "presentation",
      task: "generate-stream"
    });
    const gemini = options.find((x) => x.label === "Gemini 3 Pro");
    const claude = options.find((x) => x.label === "Claude Sonnet 4.5");
    const gpt = options.find((x) => x.label === "GPT-4.1");
    const kimi = options.find((x) => x.label === "Kimi K2.6");
    const auto = options.find((x) => x.label === "Auto");

    const ds = options.find((x) => x.label === "DeepSeek");

    expect(auto?.available).toBe(true);
    expect(auto?.recommended).toBe(false);
    expect(ds?.available).toBe(true);
    expect(ds?.recommended).toBe(true);
    expect(gemini?.available).toBe(true);
    expect(claude?.available).toBe(false);
    expect(gpt?.available).toBe(true);
    expect(kimi?.available).toBe(true);
    expect(gemini?.recommended).toBe(false);
  });
});
