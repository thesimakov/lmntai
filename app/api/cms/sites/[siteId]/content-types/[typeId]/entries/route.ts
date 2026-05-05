import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function listEntries(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; typeId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId, typeId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const entries = await prisma.cmsEntry.findMany({
    where: { siteId, contentTypeId: typeId },
    orderBy: { updatedAt: "desc" },
    include: {
      draftVersion: { select: { id: true, version: true, status: true, createdAt: true, data: true } },
      publishedVersion: { select: { id: true, version: true, status: true, createdAt: true, data: true } },
    },
  });

  return Response.json({
    entries: entries.map((row) => ({
      id: row.id,
      slug: row.slug,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      draftVersion: row.draftVersion
        ? {
            id: row.draftVersion.id,
            version: row.draftVersion.version,
            createdAt: row.draftVersion.createdAt.toISOString(),
            data: row.draftVersion.data,
          }
        : null,
      publishedVersion: row.publishedVersion
        ? {
            id: row.publishedVersion.id,
            version: row.publishedVersion.version,
            createdAt: row.publishedVersion.createdAt.toISOString(),
            data: row.publishedVersion.data,
          }
        : null,
    })),
  });
}

async function createOrUpdateEntry(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; typeId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId, typeId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    slug?: string;
    data?: unknown;
  } | null;
  const slug = (body?.slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return new Response("slug is required", { status: 400 });
  const data = body?.data && typeof body.data === "object" ? body.data : {};

  try {
    const result = await prisma.$transaction(async (tx) => {
      let entry = body?.id
        ? await tx.cmsEntry.findFirst({
            where: { id: body.id, siteId, contentTypeId: typeId },
          })
        : null;

      if (!entry) {
        entry = await tx.cmsEntry.create({
          data: {
            siteId,
            contentTypeId: typeId,
            slug,
          },
        });
      } else if (entry.slug !== slug) {
        entry = await tx.cmsEntry.update({
          where: { id: entry.id },
          data: { slug },
        });
      }

      const last = await tx.cmsEntryVersion.findFirst({
        where: { entryId: entry.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const draft = await tx.cmsEntryVersion.create({
        data: {
          entryId: entry.id,
          siteId,
          authorId: guard.data.user.id,
          version: (last?.version ?? 0) + 1,
          status: "draft",
          data: data as object,
        },
      });
      const updated = await tx.cmsEntry.update({
        where: { id: entry.id },
        data: {
          status: "draft",
          draftVersionId: draft.id,
        },
      });

      return { entry: updated, draft };
    });

    return Response.json({
      entry: {
        id: result.entry.id,
        slug: result.entry.slug,
        draftVersionId: result.entry.draftVersionId,
        status: result.entry.status,
      },
    });
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "P2002") return new Response("slug already exists", { status: 409 });
    return new Response("Failed to save entry", { status: 500 });
  }
}

export const GET = withApiLogging("/api/cms/sites/[siteId]/content-types/[typeId]/entries", listEntries);
export const POST = withApiLogging("/api/cms/sites/[siteId]/content-types/[typeId]/entries", createOrUpdateEntry);
