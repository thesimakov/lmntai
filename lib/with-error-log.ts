import type { NextRequest } from "next/server";

import { apiError } from "@/lib/api-response";
import { logServerError } from "@/lib/error-log-db";

// Matches the generic context shape Next.js App Router passes to route handlers.
type AnyCtx = { params: Promise<Record<string, string | string[]>> };

export function withErrorLog(
  module: string,
  handler: (req: NextRequest, ctx: AnyCtx) => Promise<Response>,
): (req: NextRequest, ctx: AnyCtx) => Promise<Response> {
  return async (req: NextRequest, ctx: AnyCtx): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      await logServerError(err, req, { module });
      return apiError("Internal Server Error", 500);
    }
  };
}
