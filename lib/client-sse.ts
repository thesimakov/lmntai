export function extractDataPayload(block: string): string | null {
  const line = block.split("\n").find((x) => x.startsWith("data: "));
  if (!line) return null;
  return line.slice(6);
}

export function consumeDataSseBuffer(input: string, isFinal = false): { events: string[]; carry: string } {
  const normalized = input.replace(/\r\n/g, "\n");
  const chunks = normalized.split("\n\n");
  let carry = chunks.pop() ?? "";
  const events: string[] = [];

  for (const chunk of chunks) {
    const payload = extractDataPayload(chunk);
    if (payload != null) events.push(payload);
  }

  if (isFinal && carry.trim()) {
    const payload = extractDataPayload(carry);
    if (payload != null) {
      events.push(payload);
    }
    carry = "";
  }

  return { events, carry };
}
