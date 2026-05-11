import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { requireCmsContentTypeAccess } from "@/lib/cms-core";
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
  if (!guard.ok) return apiGuardError(guard);
  const { siteId, typeId, entryId } = await params;
  const access = await requireCmsContentTypeAccess(siteId, typeId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  const entry = await prisma.cmsEntry.findFirst({
    where: { id: entryId, siteId, contentTypeId: typeId },
    include: { draftVersion: true },
  });
  if (!entry) return apiError("Not found", 404);
  if (!entry.draftVersionId || !entry.draftVersion) return apiError("Draft not found", 400);

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
