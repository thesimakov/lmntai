import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { withApiLogging } from "@/lib/with-api-logging";
import { prisma } from "@/lib/prisma";
import { getSnapshotById, deleteSnapshot } from "@/lib/project-snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  });
}

type RouteContext = { params: Promise<{ id: string; snapshotId: string }> };

async function getSnapshot(_req: NextRequest, { params }: RouteContext) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId, snapshotId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  const snapshot = await getSnapshotById(projectId, snapshotId);
  if (!snapshot) return apiError("Not found", 404);
  return apiOk({ snapshot });
}

async function deleteSnapshotRoute(_req: NextRequest, { params }: RouteContext) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId, snapshotId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  const deleted = await deleteSnapshot(projectId, snapshotId);
  if (!deleted) return apiError("Not found", 404);
  return new Response(null, { status: 204 });
}

export const GET = withApiLogging("/api/projects/[id]/snapshots/[snapshotId]", getSnapshot);
export const DELETE = withApiLogging("/api/projects/[id]/snapshots/[snapshotId]", deleteSnapshotRoute);
