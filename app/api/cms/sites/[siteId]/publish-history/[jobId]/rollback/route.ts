import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

type SnapshotPage = { pageId?: string; revisionId?: string };
type SnapshotEntry = { entryId?: string; versionId?: string };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function rollbackPublishJob(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; jobId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId, jobId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const job = await prisma.cmsPublishJob.findFirst({
    where: { id: jobId, siteId },
    select: { id: true, snapshot: true },
  });
  if (!job) return new Response("Publish job not found", { status: 404 });

  const snapshot = (job.snapshot as { pages?: SnapshotPage[]; entries?: SnapshotEntry[] } | null) ?? null;
  const pages = Array.isArray(snapshot?.pages) ? snapshot.pages : [];
  const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];

  const result = await prisma.$transaction(async (tx) => {
    let pagesApplied = 0;
    let entriesApplied = 0;

    for (const row of pages) {
      const pageId = row.pageId?.trim();
      const revisionId = row.revisionId?.trim();
      if (!pageId || !revisionId) continue;
      await tx.cmsPage.updateMany({
        where: { id: pageId, siteId },
        data: { publishedRevisionId: revisionId },
      });
      await tx.cmsPageRevision.updateMany({
        where: { id: revisionId, siteId },
        data: { status: "published" },
      });
      pagesApplied += 1;
    }

    for (const row of entries) {
      const entryId = row.entryId?.trim();
      const versionId = row.versionId?.trim();
      if (!entryId || !versionId) continue;
      await tx.cmsEntry.updateMany({
        where: { id: entryId, siteId },
        data: {
          status: "published",
          publishedVersionId: versionId,
        },
      });
      await tx.cmsEntryVersion.updateMany({
        where: { id: versionId, siteId },
        data: { status: "published" },
      });
      entriesApplied += 1;
    }

    const rollbackJob = await tx.cmsPublishJob.create({
      data: {
        siteId,
        createdById: guard.data.user.id,
        status: "rollback",
        snapshot: {
          rollbackFromJobId: jobId,
          pagesApplied,
          entriesApplied,
        },
      },
      select: { id: true, createdAt: true },
    });

    return { pagesApplied, entriesApplied, rollbackJob };
  });

  return Response.json({
    ok: true,
    rolledBackFrom: jobId,
    pagesApplied: result.pagesApplied,
    entriesApplied: result.entriesApplied,
    rollbackJobId: result.rollbackJob.id,
    createdAt: result.rollbackJob.createdAt.toISOString(),
  });
}

export const POST = withApiLogging(
  "/api/cms/sites/[siteId]/publish-history/[jobId]/rollback",
  rollbackPublishJob,
);
