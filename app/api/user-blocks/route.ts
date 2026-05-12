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

const createSchema = z.object({
  name: z.string().min(1).max(100),
  blockType: z.enum(["grapesjs", "zero"]),
  htmlContent: z.string().min(1).max(500_000),
  cssContent: z.string().optional().default(""),
  teamProjectId: z.string().optional(),
});

async function getBlocks(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined;

  // Verify project ownership before including team blocks
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
      select: { id: true },
    });
    if (!project) return apiError("Not found", 404);
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

  // Verify project ownership when creating a team block
  if (rest.teamProjectId) {
    const project = await prisma.project.findFirst({
      where: { id: rest.teamProjectId, ownerId: user.id },
      select: { id: true },
    });
    if (!project) return apiError("Not found", 404);
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
