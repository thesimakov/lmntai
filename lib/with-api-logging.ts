import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { captureJsonBodyPreview, logRequestEntry } from "@/lib/request-log";

const REDACT_BODY_PATHS = new Set(["/api/generate-stream", "/api/prompt-builder"]);

export function shouldRedactBodyPath(pathname: string, method: string, requestPathname: string): boolean {
  if (REDACT_BODY_PATHS.has(pathname)) return true;

  if (
    pathname === "/api/lemnity-ai/[...path]" &&
    method === "POST" &&
    /^\/api\/lemnity-ai\/sessions\/[^/]+\/chat$/.test(requestPathname)
  ) {
    return true;
  }

  return false;
}

function shouldRedactBody(pathname: string, req: NextRequest): boolean {
  return shouldRedactBodyPath(pathname, req.method, req.nextUrl.pathname);
}

async function resolveUserId(req: NextRequest): Promise<string | undefined> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return undefined;
  try {
    const token = await getToken({ req, secret });
    const id = token?.userId ?? token?.sub;
    return typeof id === "string" ? id : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Оборачивает обработчик API: пишет метаданные запроса в RequestLog.
 */
export function withApiLogging<TCtx>(
  pathname: string,
  handler: (req: NextRequest, ctx: TCtx) => Promise<Response>
): (req: NextRequest, ctx: TCtx) => Promise<Response> {
  return async (req: NextRequest, ctx: TCtx) => {
    const started = Date.now();
    const bodyPreview = shouldRedactBody(pathname, req) ? undefined : await captureJsonBodyPreview(req);
    const userId = await resolveUserId(req);

    try {
      const res = await handler(req, ctx);
      void logRequestEntry({
        req,
        pathname,
        userId,
        statusCode: res.status,
        durationMs: Date.now() - started,
        bodyPreview
      });
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      void logRequestEntry({
        req,
        pathname,
        userId,
        statusCode: 500,
        durationMs: Date.now() - started,
        bodyPreview,
        error: message
      });
      throw err;
    }
  };
}
