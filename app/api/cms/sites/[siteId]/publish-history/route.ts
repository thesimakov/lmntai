import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function listPublishHistory(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const jobs = await prisma.cmsPublishJob.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  return Response.json({
    jobs: jobs.map((j) => {
      const snap = (j.snapshot as { pages?: unknown[]; entries?: unknown[] } | null) ?? null;
      return {
        id: j.id,
        status: j.status,
        createdAt: j.createdAt.toISOString(),
        publishedAt: j.publishedAt?.toISOString() ?? null,
        pagesCount: Array.isArray(snap?.pages) ? snap.pages.length : 0,
        entriesCount: Array.isArray(snap?.entries) ? snap.entries.length : 0,
        author: j.createdBy ? j.createdBy.name || j.createdBy.email || j.createdBy.id : null,
      };
    }),
  });
}

export const GET = withApiLogging("/api/cms/sites/[siteId]/publish-history", listPublishHistory);
