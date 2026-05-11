/**
 * Извлекает последний sandboxId вида artifact_* из событий сессии моста (GET …/sessions/:id).
 */

export function extractLatestLemnityAiArtifactSandboxIdFromSessionEvents(events: unknown): string | null {
  if (!Array.isArray(events)) return null;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const row = events[i];
    if (!row || typeof row !== "object") continue;
    const rec = row as { event?: string; data?: Record<string, unknown> };
    if (rec.event !== "preview" || !rec.data) continue;
    const sid = rec.data.sandboxId;
    if (typeof sid === "string") {
      const t = sid.trim();
      if (t.startsWith("artifact_")) return t;
    }
    const pv = rec.data.previewUrl;
    if (typeof pv === "string") {
      const m = pv.match(/\/api\/lemnity-ai\/artifacts\/([^/?#]+)/);
      if (m?.[1]) return decodeURIComponent(m[1]);
    }
  }
  return null;
}

/** Тело ответа нашего JSON API { error: string } попало в файл песочницы. */
export function valueLooksLikeApiErrorJsonEnvelope(value: string): boolean {
  const t = value.trim();
  if (!t.startsWith("{") || !t.includes('"error"')) return false;
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    if (!o || typeof o !== "object") return false;
    if (typeof o.error === "string") {
      const e = o.error.toLowerCase().trim();
      return e === "not found" || e.includes("not found") || e.includes("not_found");
    }
  } catch {
    // не строгий JSON (обрезан / мусор) — эвристика по тексту
  }
  return /"error"\s*:\s*"/i.test(t) && /not\s*found/i.test(t);
}

export function sandboxFileMapLooksLikeJsonNotFound(files: Record<string, string>): boolean {
  return Object.values(files).some((v) => valueLooksLikeApiErrorJsonEnvelope(String(v)));
}

export function textLooksLikeJsonApiNotFoundBody(text: string): boolean {
  return valueLooksLikeApiErrorJsonEnvelope(text);
}
