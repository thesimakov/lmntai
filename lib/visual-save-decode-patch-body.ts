import { gunzipSync } from "node:zlib";

/** Согласовано с app/api/sandbox/[id]/route.ts — лимит символов после распаковки */
const MAX_VISUAL_EDIT_HTML_CHARS = 50_000_000;
/** Ограничение выхода gunzip (байты), защита от zip bomb */
const MAX_GUNZIP_OUTPUT_BYTES = Math.min(120 * 1024 * 1024, MAX_VISUAL_EDIT_HTML_CHARS * 4);

/**
 * Тело PATCH: обычный UTF-8 или gzip (заголовок Content-Encoding: gzip от клиента).
 */
export function decodeVisualSavePatchBuffer(buf: Buffer, contentEncoding: string | null): Buffer {
  const ce = (contentEncoding ?? "").toLowerCase();
  if (!ce.includes("gzip")) {
    return Buffer.from(buf);
  }
  try {
    const out = gunzipSync(buf, { maxOutputLength: MAX_GUNZIP_OUTPUT_BYTES });
    return Buffer.from(out);
  } catch {
    return Buffer.alloc(0);
  }
}
