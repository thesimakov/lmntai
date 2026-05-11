import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import {
  buildCmsPagePath,
  buildPageDocumentFromCanvas,
  normalizeCanvasSnapshot,
  normalizeCmsSlug,
  requireCmsSiteAccess,
} from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cloneRevisionContentJson(raw: unknown, newTitle: string): object {
  try {
    const deep = JSON.parse(JSON.stringify(raw ?? {})) as Record<string, unknown>;
    deep.title = newTitle;
    return deep;
  } catch {
    return buildPageDocumentFromCanvas(newTitle, null);
  }
}

async function duplicatePage(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { siteId, pageId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  const body = (await req.json().catch(() => null)) as { title?: string } | null;
  const source = await prisma.cmsPage.findFirst({
    where: { id: pageId, siteId },
    include: { draftRevision: true, publishedRevision: true },
  });
  if (!source) return apiError("Not found", 404);

  const title = body?.title?.trim() || `${source.title} — copy`;

  let parentPath: string | null = null;
  if (source.parentId) {
    const parent = await prisma.cmsPage.findFirst({
      where: { id: source.parentId, siteId },
      select: { path: true },
    });
    if (!parent) return apiError("Parent page not found", 404);
    parentPath = parent.path;
  }

  const seedSlug = `${source.slug}-copy`;
  let slug = normalizeCmsSlug(seedSlug);
  let suffix = 2;
  while (
    await prisma.cmsPage.findFirst({
      where: {
        siteId,
        path: buildCmsPagePath(parentPath, slug),
      },
      select: { id: true },
    })
  ) {
    slug = normalizeCmsSlug(`${seedSlug}-${suffix}`);
    suffix += 1;
    if (suffix > 120) return apiError("Cannot allocate path", 409);
  }

  const path = buildCmsPagePath(parentPath, slug);
  const rawContent =
    source.draftRevision?.content ??
    source.publishedRevision?.content ??
    buildPageDocumentFromCanvas(title, normalizeCanvasSnapshot(null));

  const revisionPayload = cloneRevisionContentJson(rawContent, title);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const orderSeed = await tx.cmsPage.count({ where: { siteId, parentId: source.parentId } });
      const page = await tx.cmsPage.create({
        data: {
          siteId,
          parentId: source.parentId,
          title,
          slug,
          path,
          kind: source.kind,
          isHome: false,
          sortOrder: orderSeed,
          seoTitle: source.seoTitle,
          seoDescription: source.seoDescription,
          seoKeywords: source.seoKeywords,
          seoCanonicalUrl: source.seoCanonicalUrl,
          noIndex: source.noIndex,
          seoNoFollow: source.seoNoFollow,
        },
      });

      const revision = await tx.cmsPageRevision.create({
        data: {
          pageId: page.id,
          siteId,
          authorId: guard.data.user.id,
          version: 1,
          status: "draft",
          content: revisionPayload,
        },
      });

      await tx.cmsPage.update({
        where: { id: page.id },
        data: { draftRevisionId: revision.id },
      });

      return page.id;
    });

    return Response.json({
      ok: true,
      pageId: created,
    });
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "P2002") return apiError("Path already exists", 409);
    console.error("[cms duplicate page]", e);
    return apiError("Failed to duplicate page", 500);
  }
}

export const POST = withApiLogging("/api/cms/sites/[siteId]/pages/[pageId]/duplicate", duplicatePage);
