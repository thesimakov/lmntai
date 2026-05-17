import type { NextRequest } from "next/server";

import { apiError } from "@/lib/api-response";
import { logServerError } from "@/lib/error-log-db";

export function withErrorLog<TCtx>(
  module: string,
  handler: (req: NextRequest, ctx: TCtx) => Promise<Response>,
): (req: NextRequest, ctx: TCtx) => Promise<Response> {
  return async (req: NextRequest, ctx: TCtx): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      await logServerError(err, req, { module });
      return apiError("Internal Server Error", 500);
    }
  };
}
