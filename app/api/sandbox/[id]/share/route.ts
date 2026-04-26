import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { getAuthDatabaseUserMessage } from "@/lib/prisma-auth-errors";
import { prisma } from "@/lib/prisma";
import { getOwnerShareStateForBuilder, setSandboxSharePublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

async function withOwner(
  _req: NextRequest,
  { params }: RouteCtx,
  work: (arg: { sandboxId: string; userId: string }) => Promise<Response>
): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }
  const { id: sandboxId } = await params;
  const allowed = await sandboxManager.canAccess(sandboxId, guard.data.user.id);
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }
  return work({ sandboxId, userId: guard.data.user.id });
}

async function getShare(req: NextRequest, ctx: RouteCtx) {
  return withOwner(req, ctx, async ({ sandboxId, userId }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, plan: true, shareBrandingRemovalPaidAt: true }
      });
      if (!user) {
        return Response.json({ error: "user_not_found", isPublic: false }, { status: 404 });
      }
      const state = await getOwnerShareStateForBuilder(sandboxId, user);
      return Response.json({
        isPublic: state.isPublic,
        hideLemnityHeader: state.hideLemnityHeader,
        showLemnityBranding: state.showLemnityBranding
      });
    } catch (e) {
      const msg = getAuthDatabaseUserMessage(e);
      if (msg) {
        return Response.json({ error: msg, isPublic: false }, { status: 503 });
      }
      throw e;
    }
  });
}

async function postShare(req: NextRequest, ctx: RouteCtx) {
  return withOwner(req, ctx, async ({ sandboxId, userId }) => {
    try {
      await setSandboxSharePublic(sandboxId, userId, true);
      return Response.json({ isPublic: true });
    } catch (e) {
      if (e instanceof Error && e.message === "FORBIDDEN") {
        return new Response("Forbidden", { status: 403 });
      }
      const msg = getAuthDatabaseUserMessage(e);
      if (msg) {
        return new Response(msg, { status: 503 });
      }
      throw e;
    }
  });
}

async function deleteShare(req: NextRequest, ctx: RouteCtx) {
  return withOwner(req, ctx, async ({ sandboxId, userId }) => {
    try {
      await setSandboxSharePublic(sandboxId, userId, false);
      return Response.json({ isPublic: false });
    } catch (e) {
      if (e instanceof Error && e.message === "FORBIDDEN") {
        return new Response("Forbidden", { status: 403 });
      }
      const msg = getAuthDatabaseUserMessage(e);
      if (msg) {
        return new Response(msg, { status: 503 });
      }
      throw e;
    }
  });
}

export const GET = withApiLogging("/api/sandbox/[id]/share", getShare);
export const POST = withApiLogging("/api/sandbox/[id]/share", postShare);
export const DELETE = withApiLogging("/api/sandbox/[id]/share", deleteShare);
