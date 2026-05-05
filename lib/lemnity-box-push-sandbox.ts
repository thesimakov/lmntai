import { buildLemnityBoxIndexHtml } from "@/lib/lemnity-box-build-index-html";
import type { LemnityBoxCanvasContent } from "@/lib/lemnity-box-editor-schema";
import { buildVisualSavePatchBody } from "@/lib/visual-save-client-body";

/**
 * Записывает макет Lemnity Box в песочницу превью (тот же механизм, что PATCH из iframe визуального редактора).
 * `artifact_*` — через bridge `/api/lemnity-ai/artifacts/:id`, иначе `/api/sandbox` / `/api/sandbox/:id`.
 */
export async function pushLemnityBoxCanvasToSandbox(
  sandboxId: string,
  content: LemnityBoxCanvasContent
): Promise<{ ok: true } | { ok: false; message: string }> {
  const docHtml = buildLemnityBoxIndexHtml(content);
  let body: BodyInit;
  let headers: HeadersInit;
  try {
    const built = await buildVisualSavePatchBody(docHtml);
    body = built.body;
    headers = built.headers;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }

  const isArtifact = sandboxId.startsWith("artifact_");

  try {
    let res: Response;
    if (isArtifact) {
      res = await fetch(`/api/lemnity-ai/artifacts/${encodeURIComponent(sandboxId)}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body
      });
    } else {
      res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body
      });
      if (res.status === 404) {
        res = await fetch("/api/sandbox", {
          method: "PATCH",
          headers,
          credentials: "include",
          body
        });
      }
    }

    if (res.ok || res.status === 204) {
      return { ok: true };
    }
    const msg = (await res.text().catch(() => "")) || res.statusText;
    return { ok: false, message: msg.trim() || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
