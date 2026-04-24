import { describe, expect, it } from "vitest";

import { consumeDataSseBuffer } from "@/lib/client-sse";

describe("client sse buffer", () => {
  it("keeps carry for incomplete final chunk", () => {
    const parsed = consumeDataSseBuffer('data: {"type":"progress","value":10}', false);
    expect(parsed.events).toEqual([]);
    expect(parsed.carry).toBe('data: {"type":"progress","value":10}');
  });

  it("parses carry on final flush", () => {
    const first = consumeDataSseBuffer('data: {"type":"progress","value":10}', false);
    const second = consumeDataSseBuffer(first.carry, true);
    expect(second.events).toEqual(['{"type":"progress","value":10}']);
    expect(second.carry).toBe("");
  });

  it("parses multiple events and normalizes CRLF", () => {
    const parsed = consumeDataSseBuffer(
      'data: {"type":"log","content":"x"}\r\n\r\ndata: {"type":"done"}\r\n\r\n',
      false
    );
    expect(parsed.events).toEqual(['{"type":"log","content":"x"}', '{"type":"done"}']);
    expect(parsed.carry).toBe("");
  });
});
