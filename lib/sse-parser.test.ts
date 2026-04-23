import { describe, expect, it } from "vitest";

import { extractDataJson, splitSseLines } from "@/lib/sse-parser";

describe("sse parser", () => {
  it("keeps carry for incomplete line", () => {
    const first = splitSseLines('data: {"a":1}', "");
    expect(first.lines).toEqual([]);
    expect(first.carry).toBe('data: {"a":1}');

    const second = splitSseLines("\n", first.carry);
    expect(second.lines).toEqual(['data: {"a":1}']);
    expect(second.carry).toBe("");
  });

  it("extracts data json event", () => {
    const parsed = extractDataJson('data: {"usage":{"total_tokens":10}}') as {
      usage: { total_tokens: number };
    };
    expect(parsed.usage.total_tokens).toBe(10);
  });

  it("ignores done marker", () => {
    expect(extractDataJson("data: [DONE]")).toBeNull();
  });
});
