import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectFromRequest } from "@/lib/project-domain-resolution";
import { getAuthDatabaseUserMessage } from "@/lib/prisma-auth-errors";
import { prisma } from "@/lib/prisma";
import { getOwnerShareStateForBuilder, setSandboxSharePublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function withOwner(req: NextRequest, work: (arg: { projectId: string; userId: string }) => Promise<Response>) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }
  const project = await requireProjectFromRequest(req).catch(() => null);
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }
  const allowed = await sandboxManager.canAccess(project.id, guard.data.user.id);
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }
  return work({ projectId: project.id, userId: guard.data.user.id });
}

async function getShare(req: NextRequest) {
  return withOwner(req, async ({ projectId, userId }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, plan: true, shareBrandingRemovalPaidAt: true }
      });
      if (!user) {
        return Response.json({ error: "user_not_found", isPublic: false }, { status: 404 });
      }
      const state = await getOwnerShareStateForBuilder(projectId, user);
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

async function postShare(req: NextRequest) {
  return withOwner(req, async ({ projectId, userId }) => {
    try {
      await setSandboxSharePublic(projectId, userId, true);
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

async function deleteShare(req: NextRequest) {
  return withOwner(req, async ({ projectId, userId }) => {
    try {
      await setSandboxSharePublic(projectId, userId, false);
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

export const GET = withApiLogging("/api/sandbox/share", getShare);
export const POST = withApiLogging("/api/sandbox/share", postShare);
export const DELETE = withApiLogging("/api/sandbox/share", deleteShare);
