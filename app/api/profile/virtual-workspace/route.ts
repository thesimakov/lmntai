import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getUserVirtualWorkspaceSummary } from "@/lib/user-virtual-storage";
import { withApiLogging } from "@/lib/with-api-logging";

async function getVirtualWorkspace(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const takeRaw = Number(req.nextUrl.searchParams.get("take") ?? 25);
  const take = Math.max(1, Math.min(200, Number.isFinite(takeRaw) ? takeRaw : 25));
  const cursor = req.nextUrl.searchParams.get("cursor");

  const summary = await getUserVirtualWorkspaceSummary(guard.data.user.id);
  const rows = await prisma.userVirtualEntry.findMany({
    where: { workspaceUserId: guard.data.user.id },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });

  return Response.json({
    summary: {
      limitBytes: summary.limitBytes.toString(),
      usedBytes: summary.usedBytes.toString(),
      entriesCount: summary.entriesCount,
      updatedAt: summary.updatedAt?.toISOString() ?? null
    },
    entries: rows.map((r) => ({
      id: r.id,
      virtualPath: r.virtualPath,
      kind: r.kind,
      sizeBytes: r.sizeBytes,
      createdAt: r.createdAt.toISOString(),
      content: r.content
    })),
    nextCursor: rows.length === take ? rows[rows.length - 1]?.id ?? null : null
  });
}

export const GET = withApiLogging("/api/profile/virtual-workspace", getVirtualWorkspace);
