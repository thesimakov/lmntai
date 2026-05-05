import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import { syncCmsSandboxPreviewWithFormBridge } from "@/lib/cms-sandbox-form-sync";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function publishPage(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });

  const { siteId, pageId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const page = await prisma.cmsPage.findFirst({
    where: { id: pageId, siteId },
    include: { draftRevision: true },
  });
  if (!page) return new Response("Not found", { status: 404 });
  if (!page.draftRevisionId || !page.draftRevision) {
    return new Response("Draft revision not found", { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.cmsPageRevision.update({
      where: { id: page.draftRevisionId! },
      data: { status: "published" },
    });
    return tx.cmsPage.update({
      where: { id: page.id },
      data: { publishedRevisionId: page.draftRevisionId! },
      include: {
        draftRevision: { select: { id: true, version: true } },
        publishedRevision: { select: { id: true, version: true } },
      },
    });
  });

  const sandboxPreviewSync = await syncCmsSandboxPreviewWithFormBridge({
    siteId,
    triggerPublishedPageId: updated.id,
  });
  if (!sandboxPreviewSync.ok) {
    console.error("[cms publish page] sandbox preview sync failed", sandboxPreviewSync.message);
  }

  return Response.json({
    ok: true,
    page: {
      id: updated.id,
      path: updated.path,
      draftRevisionId: updated.draftRevisionId,
      publishedRevisionId: updated.publishedRevisionId,
      draftVersion: updated.draftRevision?.version ?? null,
      publishedVersion: updated.publishedRevision?.version ?? null,
    },
    sandboxPreviewSync,
  });
}

export const POST = withApiLogging("/api/cms/sites/[siteId]/pages/[pageId]/publish", publishPage);
