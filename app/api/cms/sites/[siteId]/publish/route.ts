import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import { syncCmsSandboxPreviewWithFormBridge } from "@/lib/cms-sandbox-form-sync";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function publishSite(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    const pages = await tx.cmsPage.findMany({
      where: { siteId },
      include: { draftRevision: true },
    });
    const entries = await tx.cmsEntry.findMany({
      where: { siteId },
      include: { draftVersion: true },
    });

    const now = new Date();
    const publishedPages: Array<{ pageId: string; path: string; revisionId: string }> = [];

    for (const p of pages) {
      if (!p.draftRevisionId || !p.draftRevision) continue;
      await tx.cmsPage.update({
        where: { id: p.id },
        data: { publishedRevisionId: p.draftRevisionId },
      });
      await tx.cmsPageRevision.update({
        where: { id: p.draftRevisionId },
        data: { status: "published" },
      });
      publishedPages.push({ pageId: p.id, path: p.path, revisionId: p.draftRevisionId });
    }

    const publishedEntries: Array<{ entryId: string; slug: string; versionId: string }> = [];
    for (const e of entries) {
      if (!e.draftVersionId || !e.draftVersion) continue;
      await tx.cmsEntry.update({
        where: { id: e.id },
        data: {
          status: "published",
          publishedVersionId: e.draftVersionId,
        },
      });
      await tx.cmsEntryVersion.update({
        where: { id: e.draftVersionId },
        data: { status: "published" },
      });
      publishedEntries.push({ entryId: e.id, slug: e.slug, versionId: e.draftVersionId });
    }

    const job = await tx.cmsPublishJob.create({
      data: {
        siteId,
        createdById: guard.data.user.id,
        status: "published",
        snapshot: {
          publishedAt: now.toISOString(),
          pages: publishedPages,
          entries: publishedEntries,
        },
        publishedAt: now,
      },
      select: { id: true, status: true, createdAt: true, publishedAt: true },
    });

    return { job, publishedPages, publishedEntries };
  });

  const sandboxPreviewSync = await syncCmsSandboxPreviewWithFormBridge({ siteId });
  if (!sandboxPreviewSync.ok) {
    console.error("[cms publish] sandbox preview sync failed", sandboxPreviewSync.message);
  }

  return Response.json({
    ok: true,
    siteId,
    publishedPages: result.publishedPages.length,
    publishedEntries: result.publishedEntries.length,
    publishJob: {
      id: result.job.id,
      status: result.job.status,
      createdAt: result.job.createdAt.toISOString(),
      publishedAt: result.job.publishedAt?.toISOString() ?? null,
    },
    sandboxPreviewSync,
  });
}

export const POST = withApiLogging("/api/cms/sites/[siteId]/publish", publishSite);
