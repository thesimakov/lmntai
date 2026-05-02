import { afterEach, describe, expect, it, vi } from "vitest";

import { requestRouterAIJsonWithFallback, stringifyChatCompletionContent } from "@/lib/routerai-client";

describe("stringifyChatCompletionContent", () => {
  it("joins multipart content arrays", () => {
    expect(
      stringifyChatCompletionContent([
        { type: "text", text: '{"reply":"hi"' },
        { type: "text", text: ',"phase":"gathering"}' }
      ])
    ).toBe('{"reply":"hi","phase":"gathering"}');
  });

  it("returns empty string for unknown shapes", () => {
    expect(stringifyChatCompletionContent(null)).toBe("");
    expect(stringifyChatCompletionContent(42)).toBe("");
  });
});

describe("requestRouterAIJsonWithFallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("tries models in order and returns selected model from provider", async () => {
    vi.stubEnv("AI_GATEWAY_BASE_URL", "https://router.example.com");
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("rate limit", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            model: "openrouter/free",
            choices: [{ message: { content: "ok" } }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 3,
              total_tokens: 13
            }
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await requestRouterAIJsonWithFallback(
      {
        prompt: "hello"
      },
      ["deepseek/deepseek-r1:free", "openrouter/free", "openai/gpt-4.1"]
    );

    expect(result.text).toBe("ok");
    expect(result.model).toBe("openrouter/free");
    expect(result.requestedModel).toBe("openrouter/free");
    expect(result.attemptedModels).toEqual([
      "deepseek/deepseek-r1:free",
      "openrouter/free",
      "openai/gpt-4.1"
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { model: string };
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as { model: string };
    expect(firstBody.model).toBe("deepseek/deepseek-r1:free");
    expect(secondBody.model).toBe("openrouter/free");
  });
});
