import { beforeEach, describe, expect, it, vi } from "vitest";

import { MIN_TOKENS_PROMPT_BUILDER } from "@/lib/plan-config";

const mocks = vi.hoisted(() => {
  return {
    requireDbUser: vi.fn(),
    getSafeServerSession: vi.fn(),
    hasEnoughTokens: vi.fn(),
    resolveAgentForTask: vi.fn(),
    requestRouterAIJsonWithFallback: vi.fn(),
    chargeTokensSafely: vi.fn(),
    estimateUsageFromText: vi.fn(),
    isLemnityAiBridgeEnabledServer: vi.fn(),
    getProjectKindPromptBuilderContextRu: vi.fn(),
    isProjectKind: vi.fn(),
    getEffectivePromptBuilderMinimum: vi.fn()
  };
});

vi.mock("@/lib/with-api-logging", () => ({
  withApiLogging: (_path: string, handler: unknown) => handler
}));
vi.mock("@/lib/auth", () => ({
  getSafeServerSession: mocks.getSafeServerSession
}));
vi.mock("@/lib/auth-guards", () => ({
  requireDbUser: mocks.requireDbUser
}));
vi.mock("@/lib/token-manager", () => ({
  hasEnoughTokens: mocks.hasEnoughTokens
}));
vi.mock("@/lib/agent-models", () => ({
  resolveAgentForTask: mocks.resolveAgentForTask
}));
vi.mock("@/lib/routerai-client", () => ({
  requestRouterAIJsonWithFallback: mocks.requestRouterAIJsonWithFallback
}));
vi.mock("@/lib/token-billing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/token-billing")>();
  return {
    ...actual,
    chargeTokensSafely: mocks.chargeTokensSafely,
    estimateUsageFromText: mocks.estimateUsageFromText
  };
});
vi.mock("@/lib/lemnity-ai-bridge-config", () => ({
  isLemnityAiBridgeEnabledServer: mocks.isLemnityAiBridgeEnabledServer
}));
vi.mock("@/lib/lemnity-ai-prompt-spec", () => ({
  getProjectKindPromptBuilderContextRu: mocks.getProjectKindPromptBuilderContextRu,
  isProjectKind: mocks.isProjectKind
}));
vi.mock("@/lib/platform-plan-settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/platform-plan-settings")>();
  return {
    ...actual,
    getEffectivePromptBuilderMinimum: mocks.getEffectivePromptBuilderMinimum
  };
});

describe("prompt API free fallback chain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSafeServerSession.mockResolvedValue(null);
    mocks.requireDbUser.mockResolvedValue({
      ok: true,
      data: { user: { id: "u-1", plan: "FREE", tokenBalance: 5000 } }
    });
    mocks.hasEnoughTokens.mockReturnValue(true);
    mocks.resolveAgentForTask.mockReturnValue({
      uiLabel: "GPT-4.1",
      modelId: "openai/gpt-4.1",
      settings: { json: { temperature: 0.2 }, stream: { temperature: 0.2 } }
    });
    mocks.chargeTokensSafely.mockResolvedValue({
      ok: true,
      charged: true,
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    });
    mocks.estimateUsageFromText.mockReturnValue({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30
    });
    mocks.isLemnityAiBridgeEnabledServer.mockReturnValue(false);
    mocks.getProjectKindPromptBuilderContextRu.mockReturnValue("");
    mocks.isProjectKind.mockReturnValue(false);
    mocks.getEffectivePromptBuilderMinimum.mockResolvedValue(MIN_TOKENS_PROMPT_BUILDER);
  });

  it("bills prompt-coach using actual fallback model", async () => {
    const { POST } = await import("@/app/api/prompt-coach/route");
    mocks.requestRouterAIJsonWithFallback.mockResolvedValue({
      text: JSON.stringify({
        reply: "Собрал ТЗ.\n\nВсё верно? Запускать?",
        phase: "confirm",
        technical_prompt: "Технический промпт"
      }),
      model: "openrouter/free",
      requestedModel: "openrouter/free",
      attemptedModels: ["deepseek/deepseek-r1:free", "openrouter/free", "openai/gpt-4.1"],
      usage: { prompt_tokens: 11, completion_tokens: 19, total_tokens: 30 }
    });

    const req = new Request("http://localhost/api/prompt-coach", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Сделай лендинг" }] }),
      headers: { "content-type": "application/json" }
    });
    const res = await POST(req as never, undefined as never);
    const json = (await res.json()) as { debug_model?: string; debug_attempted_models?: string[] };

    expect(res.status).toBe(200);
    expect(json.debug_model).toBe("openrouter/free");
    expect(json.debug_attempted_models).toEqual([
      "deepseek/deepseek-r1:free",
      "openrouter/free",
      "openai/gpt-4.1"
    ]);
    expect(mocks.requestRouterAIJsonWithFallback).toHaveBeenCalledTimes(1);
    expect(mocks.chargeTokensSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openrouter/free"
      })
    );
  });

  it("bills prompt-builder questions using actual fallback model", async () => {
    const { POST } = await import("@/app/api/prompt-builder/route");
    mocks.requestRouterAIJsonWithFallback.mockResolvedValue({
      text: JSON.stringify({
        questions: ["Какая цель сайта?"]
      }),
      model: "openrouter/free",
      requestedModel: "openrouter/free",
      attemptedModels: ["deepseek/deepseek-r1:free", "openrouter/free", "openai/gpt-4.1"],
      usage: { prompt_tokens: 8, completion_tokens: 7, total_tokens: 15 }
    });

    const req = new Request("http://localhost/api/prompt-builder", {
      method: "POST",
      body: JSON.stringify({ mode: "questions", idea: "Сайт для турагентства" }),
      headers: { "content-type": "application/json" }
    });
    const res = await POST(req as never, undefined as never);
    const json = (await res.json()) as {
      questions?: string[];
      debug_model?: string;
      debug_attempted_models?: string[];
    };

    expect(res.status).toBe(200);
    expect(json.questions?.[0]).toBe("Какая цель сайта?");
    expect(json.debug_model).toBe("openrouter/free");
    expect(json.debug_attempted_models).toEqual([
      "deepseek/deepseek-r1:free",
      "openrouter/free",
      "openai/gpt-4.1"
    ]);
    expect(mocks.requestRouterAIJsonWithFallback).toHaveBeenCalledTimes(1);
    expect(mocks.chargeTokensSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openrouter/free"
      })
    );
  });
});
