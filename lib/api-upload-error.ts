/**
 * Parses upload API failures. Nginx returns HTML 413 before Next.js when
 * client_max_body_size is too small (default 1m).
 */
export async function readUploadApiErrorMessage(
  res: Response,
  messages: { fallback: string; tooLarge: string }
): Promise<string> {
  if (res.status === 413) {
    return messages.tooLarge;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (typeof body?.error === "string" && body.error.trim().length > 0) {
      return body.error.trim();
    }
  } else {
    const text = (await res.text().catch(() => "")).trim();
    if (text.length > 0 && !text.includes("<html")) {
      return text.slice(0, 240);
    }
  }

  return `${messages.fallback} (${res.status})`;
}
