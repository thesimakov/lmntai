import { z } from "zod";
import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { withApiLogging } from "@/lib/with-api-logging";
import { parseBody } from "@/lib/api-schemas";
import { getUserBlockById, renameUserBlock, deleteUserBlock } from "@/lib/user-saved-blocks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const renameSchema = z.object({ name: z.string().min(1).max(100) });

async function getBlock(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const { id } = await params;
  const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined;

  // Verify project ownership before granting team-scope access
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
      select: { id: true },
    });
    if (!project) return apiError("Not found", 404);
  }

  const block = await getUserBlockById(id, user.id, projectId);
  if (!block) return apiError("Not found", 404);
  return apiOk({ block });
}

async function patchBlock(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const { id } = await params;
  const parsed = await parseBody(req, renameSchema);
  if (!parsed.ok) return parsed.response;

  const ok = await renameUserBlock(id, user.id, parsed.data.name);
  if (!ok) return apiError("Not found", 404);
  return apiOk({ ok: true });
}

async function deleteBlock(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const { id } = await params;
  const ok = await deleteUserBlock(id, user.id);
  if (!ok) return apiError("Not found", 404);
  return new Response(null, { status: 204 });
}

export const GET = withApiLogging("/api/user-blocks/[id]", getBlock);
export const PATCH = withApiLogging("/api/user-blocks/[id]", patchBlock);
export const DELETE = withApiLogging("/api/user-blocks/[id]", deleteBlock);
