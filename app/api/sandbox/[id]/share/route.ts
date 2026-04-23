import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { getAuthDatabaseUserMessage } from "@/lib/prisma-auth-errors";
import { getSandboxShareState, setSandboxSharePublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function withOwner(
  _req: NextRequest,
  { params }: { params: { id: string } },
  work: (arg: { sandboxId: string; userId: string }) => Promise<Response>
): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }
  const sandboxId = params.id;
  const allowed = await sandboxManager.canAccess(sandboxId, guard.data.user.id);
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }
  return work({ sandboxId, userId: guard.data.user.id });
}

async function getShare(req: NextRequest, ctx: { params: { id: string } }) {
  return withOwner(req, ctx, async ({ sandboxId }) => {
    try {
      const state = await getSandboxShareState(sandboxId);
      return Response.json({ isPublic: state.isPublic });
    } catch (e) {
      const msg = getAuthDatabaseUserMessage(e);
      if (msg) {
        return Response.json({ error: msg, isPublic: false }, { status: 503 });
      }
      throw e;
    }
  });
}

async function postShare(req: NextRequest, ctx: { params: { id: string } }) {
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

async function deleteShare(req: NextRequest, ctx: { params: { id: string } }) {
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
