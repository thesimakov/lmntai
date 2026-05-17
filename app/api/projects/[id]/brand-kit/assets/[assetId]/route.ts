import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getProjectBrandKitAssetResponse } from "@/lib/project-brand-kit-service";

export const runtime = "nodejs";

async function requireProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId, assetId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  const result = await getProjectBrandKitAssetResponse(projectId, assetId);
  if (!result) return apiError("Asset not found", 404);

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": result.mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
