/**
 * Тело PATCH для сохранения HTML: при наличии CompressionStream — gzip (меньше байт до nginx).
 */
export async function buildVisualSavePatchBody(html: string): Promise<{
  body: BodyInit;
  headers: HeadersInit;
  /** Размер тела в байтах (для отладки) */
  wireBytes: number;
}> {
  if (typeof CompressionStream === "undefined") {
    const enc = new TextEncoder().encode(html);
    return {
      body: html,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      wireBytes: enc.byteLength
    };
  }
  try {
    const stream = new Blob([new TextEncoder().encode(html)]).stream().pipeThrough(new CompressionStream("gzip"));
    const out = await new Response(stream).arrayBuffer();
    return {
      body: out,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Encoding": "gzip"
      },
      wireBytes: out.byteLength
    };
  } catch {
    const enc = new TextEncoder().encode(html);
    return {
      body: html,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      wireBytes: enc.byteLength
    };
  }
}
