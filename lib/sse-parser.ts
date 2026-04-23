export function splitSseLines(input: string, carry: string) {
  const merged = `${carry}${input}`;
  const normalized = merged.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  const nextCarry = lines.pop() ?? "";
  return { lines, carry: nextCarry };
}

export function extractDataJson(line: string): unknown | null {
  if (!line.startsWith("data:")) return null;
  const raw = line.slice("data:".length).trim();
  if (!raw || raw === "[DONE]") return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
