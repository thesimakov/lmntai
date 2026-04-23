/**
 * HTTP-клиент к FastAPI внутри контейнера ai-manus sandbox (порт 8080).
 * Контракты подобраны под вызовы в `sandbox-manager.ts`; при смене API правьте пути/тело здесь.
 */

export type ManusApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type SupervisorRow = { statename?: string; state?: string; name?: string };

function normalizeBase(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

export function manusAllServicesRunning(services: unknown[]): boolean {
  if (!Array.isArray(services) || services.length === 0) return false;
  return services.every((row) => {
    if (!row || typeof row !== "object") return false;
    const s = row as SupervisorRow;
    if (s.statename == null && s.state == null) return true;
    const st = String(s.statename ?? s.state ?? "").toUpperCase();
    return st === "RUNNING";
  });
}

export async function manusSupervisorStatus(baseUrl: string): Promise<ManusApiResponse<SupervisorRow[]>> {
  const base = normalizeBase(baseUrl);
  const urls = [`${base}/supervisor/status`, `${base}/api/supervisor/status`];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8_000) });
      const body = (await readJson(res)) as Record<string, unknown>;
      const list = Array.isArray(body)
        ? (body as SupervisorRow[])
        : (Array.isArray(body.data)
            ? (body.data as SupervisorRow[])
            : (Array.isArray(body.services)
                ? (body.services as SupervisorRow[])
                : (Array.isArray(body.processes) ? (body.processes as SupervisorRow[]) : [])));
      if (res.ok && list.length > 0) {
        return { success: true, data: list };
      }
    } catch {
      // try next url
    }
  }
  return { success: false, message: "supervisor/status недоступен" };
}

export async function manusFileWrite(
  baseUrl: string,
  path: string,
  content: string,
  opts?: { append?: boolean }
): Promise<ManusApiResponse<unknown>> {
  const base = normalizeBase(baseUrl);
  try {
    const res = await fetch(`${base}/file/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content, append: opts?.append ?? false }),
      signal: AbortSignal.timeout(120_000)
    });
    const body = (await readJson(res)) as Record<string, unknown>;
    const ok = body.success === true || body.ok === true || res.ok;
    return {
      success: Boolean(ok),
      message: typeof body.message === "string" ? body.message : undefined,
      data: body.data
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "file/write failed" };
  }
}

export async function manusFileRead(
  baseUrl: string,
  path: string
): Promise<ManusApiResponse<{ content: string }>> {
  const base = normalizeBase(baseUrl);
  try {
    const res = await fetch(`${base}/file/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      signal: AbortSignal.timeout(60_000)
    });
    const body = (await readJson(res)) as Record<string, unknown>;
    const content =
      typeof body.content === "string"
        ? body.content
        : body.data && typeof (body.data as { content?: unknown }).content === "string"
          ? String((body.data as { content: string }).content)
          : "";
    const ok = body.success === true || body.ok === true || (res.ok && content.length > 0);
    return {
      success: Boolean(ok),
      message: typeof body.message === "string" ? body.message : undefined,
      data: { content }
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "file/read failed" };
  }
}

export async function manusFileFind(
  baseUrl: string,
  workdir: string,
  pattern: string
): Promise<ManusApiResponse<{ files: string[] }>> {
  const base = normalizeBase(baseUrl);
  try {
    const res = await fetch(`${base}/file/find`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workdir, pattern, glob: pattern }),
      signal: AbortSignal.timeout(60_000)
    });
    const body = (await readJson(res)) as Record<string, unknown>;
    const rawFiles = body.files ?? (body.data as { files?: unknown } | undefined)?.files;
    const files = Array.isArray(rawFiles) ? rawFiles.filter((x): x is string => typeof x === "string") : [];
    const ok = body.success === true || body.ok === true || res.ok;
    return {
      success: Boolean(ok),
      message: typeof body.message === "string" ? body.message : undefined,
      data: { files }
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "file/find failed" };
  }
}
