import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { buildCmsPagePath, buildPageDocumentFromCanvas, normalizeCanvasSnapshot, normalizeCmsPath, normalizeCmsSlug, requireCmsSiteAccess } from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getPage(
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
    include: {
      draftRevision: true,
      publishedRevision: true,
    },
  });
  if (!page) return new Response("Not found", { status: 404 });

  return Response.json({
    page: {
      id: page.id,
      title: page.title,
      slug: page.slug,
      path: page.path,
      parentId: page.parentId,
      kind: page.kind,
      isHome: page.isHome,
      sortOrder: page.sortOrder,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      noIndex: page.noIndex,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
      draftRevisionId: page.draftRevisionId,
      publishedRevisionId: page.publishedRevisionId,
      draftContent: page.draftRevision?.content ?? null,
      publishedContent: page.publishedRevision?.content ?? null,
    },
  });
}

async function patchPage(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId, pageId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    slug?: string;
    path?: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    noIndex?: boolean;
    isHome?: boolean;
    content?: unknown;
  } | null;

  const page = await prisma.cmsPage.findFirst({
    where: { id: pageId, siteId },
    select: {
      id: true,
      title: true,
      path: true,
      slug: true,
      parentId: true,
      isHome: true,
      draftRevisionId: true,
    },
  });
  if (!page) return new Response("Not found", { status: 404 });

  const nextTitle = body?.title?.trim() || page.title;
  const nextSlug = body?.slug ? normalizeCmsSlug(body.slug) : page.slug;
  let parentPath: string | null = null;
  if (page.parentId) {
    const parent = await prisma.cmsPage.findFirst({
      where: { id: page.parentId, siteId },
      select: { path: true },
    });
    parentPath = parent?.path ?? null;
  }
  const nextPath = body?.path ? normalizeCmsPath(body.path) : (page.isHome ? "/" : buildCmsPagePath(parentPath, nextSlug));
  const setHome = typeof body?.isHome === "boolean" ? body.isHome : page.isHome;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (setHome) {
        await tx.cmsPage.updateMany({
          where: { siteId, isHome: true, NOT: { id: page.id } },
          data: { isHome: false },
        });
      }

      let draftRevisionId = page.draftRevisionId;
      if (body && "content" in body) {
        const last = await tx.cmsPageRevision.findFirst({
          where: { pageId: page.id },
          orderBy: { version: "desc" },
          select: { version: true },
        });
        const doc = buildPageDocumentFromCanvas(nextTitle, normalizeCanvasSnapshot(body.content));
        const createdRevision = await tx.cmsPageRevision.create({
          data: {
            pageId: page.id,
            siteId,
            authorId: guard.data.user.id,
            version: (last?.version ?? 0) + 1,
            status: "draft",
            content: doc,
          },
          select: { id: true },
        });
        draftRevisionId = createdRevision.id;
      }

      return tx.cmsPage.update({
        where: { id: page.id },
        data: {
          title: nextTitle,
          slug: nextSlug,
          path: nextPath,
          seoTitle: body?.seoTitle ?? undefined,
          seoDescription: body?.seoDescription ?? undefined,
          noIndex: typeof body?.noIndex === "boolean" ? body.noIndex : undefined,
          isHome: setHome,
          draftRevisionId: draftRevisionId ?? undefined,
        },
        include: { draftRevision: true, publishedRevision: true },
      });
    });

    return Response.json({
      page: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        path: updated.path,
        isHome: updated.isHome,
        draftRevisionId: updated.draftRevisionId,
        publishedRevisionId: updated.publishedRevisionId,
        draftContent: updated.draftRevision?.content ?? null,
        publishedContent: updated.publishedRevision?.content ?? null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "P2002") return new Response("Path already exists", { status: 409 });
    return new Response("Failed to update page", { status: 500 });
  }
}

export const GET = withApiLogging("/api/cms/sites/[siteId]/pages/[pageId]", getPage);
export const PATCH = withApiLogging("/api/cms/sites/[siteId]/pages/[pageId]", patchPage);
