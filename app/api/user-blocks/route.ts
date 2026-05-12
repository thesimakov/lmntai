import { z } from "zod";
import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { withApiLogging } from "@/lib/with-api-logging";
import { parseBody } from "@/lib/api-schemas";
import { listUserBlocks, createUserBlock } from "@/lib/user-saved-blocks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Helper: returns true if user owns the project OR has an accepted team invitation from the owner
async function canAccessProject(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });
  if (!project) return false;
  if (project.ownerId === userId) return true;

  const invitation = await prisma.teamInvitation.findFirst({
    where: { userId: project.ownerId, invitedUserId: userId, status: "ACCEPTED" },
    select: { id: true },
  });
  return invitation !== null;
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  blockType: z.enum(["grapesjs", "zero"]),
  htmlContent: z.string().min(1).max(500_000),
  cssContent: z.string().max(500_000).optional().default(""),
  teamProjectId: z.string().optional(),
});

async function getBlocks(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined;

  // Verify project access (owner or accepted team member) before including team blocks
  if (projectId) {
    const canAccess = await canAccessProject(projectId, user.id);
    if (!canAccess) return apiError("Not found", 404);
  }

  const blocks = await listUserBlocks(user.id, projectId);
  return apiOk({ blocks });
}

async function postBlock(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;

  const { cssContent = "", ...rest } = parsed.data;

  // Verify project access (owner or accepted team member) when creating a team block
  if (rest.teamProjectId) {
    const canAccess = await canAccessProject(rest.teamProjectId, user.id);
    if (!canAccess) return apiError("Not found", 404);
  }

  try {
    const block = await createUserBlock({ userId: user.id, cssContent, ...rest });
    return apiOk({ block }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    if (msg.includes("Block library limit")) return apiError(msg, 429);
    return apiError("Internal server error", 500);
  }
}

export const GET = withApiLogging("/api/user-blocks", getBlocks);
export const POST = withApiLogging("/api/user-blocks", postBlock);
