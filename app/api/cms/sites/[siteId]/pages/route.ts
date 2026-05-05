import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { buildCmsPagePath, buildPageDocumentFromCanvas, normalizeCanvasSnapshot, normalizeCmsSlug, requireCmsSiteAccess } from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function listPages(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId } = await params;
  const allowed = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!allowed) return new Response("Not found", { status: 404 });

  const pages = await prisma.cmsPage.findMany({
    where: { siteId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      draftRevision: { select: { id: true, version: true, createdAt: true } },
      publishedRevision: { select: { id: true, version: true, createdAt: true } },
    },
  });

  return Response.json({
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      path: p.path,
      kind: p.kind,
      isHome: p.isHome,
      parentId: p.parentId,
      sortOrder: p.sortOrder,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      noIndex: p.noIndex,
      draftRevisionId: p.draftRevisionId,
      publishedRevisionId: p.publishedRevisionId,
      updatedAt: p.updatedAt.toISOString(),
      draftVersion: p.draftRevision?.version ?? null,
      publishedVersion: p.publishedRevision?.version ?? null,
    })),
  });
}

async function createPage(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    slug?: string;
    parentId?: string | null;
    kind?: string;
    content?: unknown;
    isHome?: boolean;
  } | null;

  const title = body?.title?.trim() || "Новая страница";
  const slug = normalizeCmsSlug(body?.slug?.trim() || title);
  const parentId = body?.parentId?.trim() || null;
  const kind = body?.kind?.trim() || "page";
  const isHome = Boolean(body?.isHome);

  let parentPath: string | null = null;
  if (parentId) {
    const parent = await prisma.cmsPage.findFirst({
      where: { id: parentId, siteId },
      select: { path: true },
    });
    if (!parent) return new Response("Parent page not found", { status: 404 });
    parentPath = parent.path;
  }
  const path = isHome ? "/" : buildCmsPagePath(parentPath, slug);

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (isHome) {
        await tx.cmsPage.updateMany({
          where: { siteId, isHome: true },
          data: { isHome: false },
        });
      }

      const orderSeed = await tx.cmsPage.count({ where: { siteId, parentId } });
      const page = await tx.cmsPage.create({
        data: {
          siteId,
          parentId,
          title,
          slug,
          path,
          kind,
          isHome,
          sortOrder: orderSeed,
        },
      });
      const doc = buildPageDocumentFromCanvas(title, normalizeCanvasSnapshot(body?.content));
      const revision = await tx.cmsPageRevision.create({
        data: {
          pageId: page.id,
          siteId,
          authorId: guard.data.user.id,
          version: 1,
          status: "draft",
          content: doc,
        },
      });
      const updatedPage = await tx.cmsPage.update({
        where: { id: page.id },
        data: { draftRevisionId: revision.id },
      });
      return { page: updatedPage, revision };
    });

    return Response.json({
      page: {
        id: created.page.id,
        title: created.page.title,
        slug: created.page.slug,
        path: created.page.path,
        kind: created.page.kind,
        isHome: created.page.isHome,
        parentId: created.page.parentId,
        draftRevisionId: created.page.draftRevisionId,
      },
    });
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "P2002") return new Response("Path already exists", { status: 409 });
    return new Response("Failed to create page", { status: 500 });
  }
}

export const GET = withApiLogging("/api/cms/sites/[siteId]/pages", listPages);
export const POST = withApiLogging("/api/cms/sites/[siteId]/pages", createPage);
