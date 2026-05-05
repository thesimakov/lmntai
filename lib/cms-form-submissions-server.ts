const MAX_KEYS = 48;
const MAX_KEY_LEN = 120;
const MAX_VAL_LEN = 8000;

export function normalizeCmsFormSubmissionFields(raw: unknown): Record<string, string> | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  let count = 0;
  for (const [k0, v0] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= MAX_KEYS) break;
    const k = k0.trim().slice(0, MAX_KEY_LEN);
    if (!k) continue;
    if (typeof v0 !== "string") continue;
    out[k] = v0.slice(0, MAX_VAL_LEN);
    count++;
  }
  return out;
}
