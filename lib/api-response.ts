import { unknownToErrorMessage } from "@/lib/unknown-error-message";

export type ApiErrorBody = { error: string; code?: string };

/**
 * Стандартный JSON-ответ с ошибкой: { error: string }.
 * Заменяет смесь new Response(text), { ok: false, error }, { error } по всему API.
 */
export function apiError(
  message: string,
  status: number,
  opts?: { code?: string; headers?: HeadersInit },
): Response {
  const body: ApiErrorBody = { error: message };
  if (opts?.code) body.code = opts.code;
  return Response.json(body, { status, headers: opts?.headers });
}

/**
 * Стандартный JSON-ответ об ошибке из guard-объекта.
 * Заменяет: new Response(guard.message, { status: guard.status })
 */
export function apiGuardError(guard: { status: number; message: string }): Response {
  return apiError(guard.message, guard.status);
}

/**
 * Стандартный JSON-ответ с данными.
 */
export function apiOk<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * Обёртка для catch-блоков в route.ts: логирует и возвращает 500.
 */
export function apiServerError(e: unknown, label: string): Response {
  const message = unknownToErrorMessage(e);
  console.error(`[${label}]`, message);
  return apiError("Internal server error", 500);
}

/**
 * Ответ для бинарных файлов (PPTX, PDF и пр.). Единственный легитимный случай
 * использования `new Response()` в кодовой базе — для не-JSON бинарных данных.
 */
export function apiFile(
  buffer: Buffer | Uint8Array,
  filename: string,
  mimeType: string,
): Response {
  const safeFilename = filename.replace(/[";\r\n\\]/g, "_");
  // Copy into a fresh ArrayBuffer so TypeScript's BodyInit constraint is satisfied.
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  return new Response(ab, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
    },
  });
}

/**
 * Сериализует Date → ISO-строку; строки и null пропускает без изменений.
 */
export function isoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") return d;
  return d.toISOString();
}
