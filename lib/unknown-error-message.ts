/** Безопасная строка для catch (в т.ч. когда прилетает Event, а не Error). */
export function unknownToErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message || e.name || "Error";
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  if (e instanceof Event) {
    return e.type ? `Event: ${e.type}` : "Event";
  }
  try {
    return String(e);
  } catch {
    return "Unknown error";
  }
}
