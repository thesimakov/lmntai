import { z } from "zod";
import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { withApiLogging } from "@/lib/with-api-logging";
import { prisma } from "@/lib/prisma";
import { listSnapshotsMeta, createSnapshot } from "@/lib/project-snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateSnapshotBody = z.object({
  promptText: z.string().min(1).max(2000),
  sandboxHtml: z.string().min(1),
  sandboxCss: z.string().default(""),
  sandboxId: z.string().nullable().optional(),
});

async function requireProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  });
}

async function getSnapshots(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  const snapshots = await listSnapshotsMeta(projectId);
  return apiOk({ snapshots });
}

async function postSnapshot(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  const raw = await req.json().catch(() => null);
  const parsed = CreateSnapshotBody.safeParse(raw);
  if (!parsed.success) return apiError("Invalid request body", 400);

  const snapshot = await createSnapshot({ projectId, ...parsed.data });
  return apiOk({ snapshot }, 201);
}

export const GET = withApiLogging("/api/projects/[id]/snapshots", getSnapshots);
export const POST = withApiLogging("/api/projects/[id]/snapshots", postSnapshot);
