import type { NextRequest } from "next/server";

import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { requireAdminUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const guard = await requireAdminUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id } = await ctx.params;

  const body = (await req.json().catch(() => null)) as { resolved?: unknown } | null;
  if (!body || typeof body.resolved !== "boolean") {
    return apiError("Bad request: resolved (boolean) is required", 400);
  }

  const { resolved } = body;

  try {
    await prisma.errorLog.update({
      where: { id },
      data: {
        resolved,
        resolvedAt: resolved ? new Date() : null,
      },
    });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2025") {
      return apiError("Not found", 404);
    }
    throw e;
  }

  return apiOk({ ok: true });
}
