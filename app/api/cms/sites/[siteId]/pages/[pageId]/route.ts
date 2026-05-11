import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { buildCmsPagePath, buildPageDocumentFromCanvas, normalizeCanvasSnapshot, normalizeCmsPath, normalizeCmsSlug, requireCmsSiteAccess } from "@/lib/cms-core";
import { syncCmsSandboxPreviewWithFormBridge } from "@/lib/cms-sandbox-form-sync";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function seoStringFromBody(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s === "" ? null : s;
}

async function getPage(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { siteId, pageId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  const page = await prisma.cmsPage.findFirst({
    where: { id: pageId, siteId },
    include: {
      draftRevision: true,
      publishedRevision: true,
    },
  });
  if (!page) return apiError("Not found", 404);

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
      seoKeywords: page.seoKeywords,
      seoCanonicalUrl: page.seoCanonicalUrl,
      noIndex: page.noIndex,
      seoNoFollow: page.seoNoFollow,
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
  if (!guard.ok) return apiGuardError(guard);
  const { siteId, pageId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    slug?: string;
    path?: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoKeywords?: string | null;
    seoCanonicalUrl?: string | null;
    noIndex?: boolean;
    seoNoFollow?: boolean;
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
  if (!page) return apiError("Not found", 404);

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
          where: { pageId: page.id, deletedAt: null },
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

      const pageUpdate: {
        title: string;
        slug: string;
        path: string;
        seoTitle?: string | null;
        seoDescription?: string | null;
        seoKeywords?: string | null;
        seoCanonicalUrl?: string | null;
        noIndex?: boolean;
        seoNoFollow?: boolean;
        isHome: boolean;
        draftRevisionId?: string | null;
      } = {
        title: nextTitle,
        slug: nextSlug,
        path: nextPath,
        isHome: setHome,
      };
      pageUpdate.draftRevisionId = draftRevisionId;
      if (body) {
        if ("seoTitle" in body) pageUpdate.seoTitle = seoStringFromBody(body.seoTitle) ?? null;
        if ("seoDescription" in body) pageUpdate.seoDescription = seoStringFromBody(body.seoDescription) ?? null;
        if ("seoKeywords" in body) pageUpdate.seoKeywords = seoStringFromBody(body.seoKeywords) ?? null;
        if ("seoCanonicalUrl" in body) pageUpdate.seoCanonicalUrl = seoStringFromBody(body.seoCanonicalUrl) ?? null;
        if ("noIndex" in body && typeof body.noIndex === "boolean") pageUpdate.noIndex = body.noIndex;
        if ("seoNoFollow" in body && typeof body.seoNoFollow === "boolean") pageUpdate.seoNoFollow = body.seoNoFollow;
      }

      return tx.cmsPage.update({
        where: { id: page.id },
        data: pageUpdate,
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
        seoTitle: updated.seoTitle,
        seoDescription: updated.seoDescription,
        seoKeywords: updated.seoKeywords,
        seoCanonicalUrl: updated.seoCanonicalUrl,
        noIndex: updated.noIndex,
        seoNoFollow: updated.seoNoFollow,
        draftRevisionId: updated.draftRevisionId,
        publishedRevisionId: updated.publishedRevisionId,
        draftContent: updated.draftRevision?.content ?? null,
        publishedContent: updated.publishedRevision?.content ?? null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "P2002") return apiError("Path already exists", 409);
    return apiError("Failed to update page", 500);
  }
}

async function deletePage(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { siteId, pageId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  const page = await prisma.cmsPage.findFirst({
    where: { id: pageId, siteId },
    select: { id: true, isHome: true },
  });
  if (!page) return apiError("Not found", 404);

  await prisma.$transaction(async (tx) => {
    if (page.isHome) {
      const successor = await tx.cmsPage.findFirst({
        where: { siteId, NOT: { id: page.id } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      if (successor) {
        await tx.cmsPage.updateMany({
          where: { siteId, isHome: true },
          data: { isHome: false },
        });
        await tx.cmsPage.update({
          where: { id: successor.id },
          data: { isHome: true },
        });
      }
    }

    await tx.cmsPage.update({
      where: { id: page.id },
      data: { draftRevisionId: null, publishedRevisionId: null },
    });
    await tx.cmsPageRevision.updateMany({
      where: { pageId: page.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await tx.cmsPage.delete({
      where: { id: page.id },
    });
  });

  const sandboxPreviewSync = await syncCmsSandboxPreviewWithFormBridge({ siteId });
  if (!sandboxPreviewSync.ok) {
    console.error("[cms delete page] sandbox preview sync failed", sandboxPreviewSync.message);
  }

  return Response.json({
    ok: true,
    sandboxPreviewSync,
  });
}

export const GET = withApiLogging("/api/cms/sites/[siteId]/pages/[pageId]", getPage);
export const PATCH = withApiLogging("/api/cms/sites/[siteId]/pages/[pageId]", patchPage);
export const DELETE = withApiLogging("/api/cms/sites/[siteId]/pages/[pageId]", deletePage);
