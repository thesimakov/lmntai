import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getPublishedEntries(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; contentTypeApiKey: string }> },
) {
  const { siteId, contentTypeApiKey } = await params;
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim() || null;
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") ?? "20") || 20));

  const contentType = await prisma.cmsContentType.findFirst({
    where: { siteId, apiKey: contentTypeApiKey },
    select: { id: true, apiKey: true, name: true },
  });
  if (!contentType) return new Response("Not found", { status: 404 });

  const entries = await prisma.cmsEntry.findMany({
    where: slug
      ? {
          siteId,
          contentTypeId: contentType.id,
          slug,
          publishedVersionId: { not: null },
        }
      : {
          siteId,
          contentTypeId: contentType.id,
          publishedVersionId: { not: null },
        },
    include: {
      publishedVersion: {
        select: { id: true, version: true, createdAt: true, data: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: slug ? 1 : take,
  });

  return Response.json({
    siteId,
    contentType: {
      apiKey: contentType.apiKey,
      name: contentType.name,
    },
    count: entries.length,
    entries: entries.map((e) => ({
      id: e.id,
      slug: e.slug,
      publishedAt: e.publishedVersion?.createdAt?.toISOString() ?? null,
      data: e.publishedVersion?.data ?? null,
    })),
  });
}

export const GET = withApiLogging(
  "/api/headless/sites/[siteId]/content/[contentTypeApiKey]",
  getPublishedEntries,
);
