import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { getAuthDatabaseUserMessage } from "@/lib/prisma-auth-errors";
import {
  assertCanHideShareBranding,
  setSandboxShareHideHeader
} from "@/lib/sandbox-share-db";
import { userCanAccessPreviewAssetStorage } from "@/lib/sandbox-preview-asset-access";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

async function patchBranding(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return apiGuardError(guard);
  }
  const { id: routeId } = await ctx.params;
  const resolvedProject = await resolveProjectFromRequest(req);
  if (resolvedProject && routeId !== resolvedProject.id) {
    return apiError("Not found", 404);
  }
  const sandboxId = resolvedProject?.id ?? routeId;
  const allowed = await userCanAccessPreviewAssetStorage(guard.data.user.id, sandboxId);
  if (!allowed) {
    return apiError("Not found", 404);
  }

  let body: { hideLemnityHeader?: unknown };
  try {
    body = (await req.json()) as { hideLemnityHeader?: unknown };
  } catch {
    return apiError("Invalid JSON", 400);
  }
  const hide = Boolean(body.hideLemnityHeader);

  try {
    const canHide = await assertCanHideShareBranding(guard.data.user.id, hide);
    if (!canHide) {
      return Response.json({ error: "payment_required", hideLemnityHeader: false }, { status: 402 });
    }
    await setSandboxShareHideHeader(sandboxId, guard.data.user.id, hide);
    return Response.json({ hideLemnityHeader: hide });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return apiError("Forbidden", 403);
    }
    const msg = getAuthDatabaseUserMessage(e);
    if (msg) {
      return apiError(msg, 503);
    }
    throw e;
  }
}

export const PATCH = withApiLogging("/api/sandbox/[id]/share/branding", patchBranding);
