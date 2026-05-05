import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function publishEntry(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; typeId: string; entryId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId, typeId, entryId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const entry = await prisma.cmsEntry.findFirst({
    where: { id: entryId, siteId, contentTypeId: typeId },
    include: { draftVersion: true },
  });
  if (!entry) return new Response("Not found", { status: 404 });
  if (!entry.draftVersionId || !entry.draftVersion) return new Response("Draft not found", { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.cmsEntryVersion.update({
      where: { id: entry.draftVersionId! },
      data: { status: "published" },
    });
    return tx.cmsEntry.update({
      where: { id: entry.id },
      data: {
        status: "published",
        publishedVersionId: entry.draftVersionId!,
      },
    });
  });

  return Response.json({
    ok: true,
    entry: {
      id: updated.id,
      status: updated.status,
      publishedVersionId: updated.publishedVersionId,
    },
  });
}

export const POST = withApiLogging(
  "/api/cms/sites/[siteId]/content-types/[typeId]/entries/[entryId]/publish",
  publishEntry,
);
