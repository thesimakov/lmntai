import type { NextRequest } from "next/server";

import { injectCmsFormBridgeIntoPageDocument } from "@/lib/cms-form-bridge";
import type { PageDocument } from "@/lib/lemnity-box-editor-schema";
import { prepareLemnityBoxBodyHtmlForPublish } from "@/lib/lemnity-box-html-embed-expand";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function enrichPublishedContent(
  content: unknown,
  ctx: { siteId: string; pageId: string; path: string },
): unknown {
  if (!content || typeof content !== "object") return content;
  const c = content as PageDocument;
  if (c.version !== 1 || !c.grapesjs || typeof c.grapesjs.html !== "string") return content;
  const expanded: PageDocument = {
    ...c,
    grapesjs: {
      ...c.grapesjs,
      html: prepareLemnityBoxBodyHtmlForPublish(c.grapesjs.html),
    },
  };
  return injectCmsFormBridgeIntoPageDocument(expanded, {
    siteId: ctx.siteId,
    pageId: ctx.pageId,
    pagePath: ctx.path,
  });
}

async function getPublishedPages(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const url = new URL(req.url);
  const path = url.searchParams.get("path")?.trim() || null;
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") ?? "20") || 20));

  const pages = await prisma.cmsPage.findMany({
    where: path
      ? { siteId, path, publishedRevisionId: { not: null } }
      : { siteId, publishedRevisionId: { not: null } },
    include: {
      publishedRevision: {
        select: { id: true, version: true, content: true, createdAt: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { path: "asc" }],
    take: path ? 1 : take,
  });

  return Response.json({
    siteId,
    count: pages.length,
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      path: p.path,
      kind: p.kind,
      isHome: p.isHome,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      noIndex: p.noIndex,
      publishedAt: p.publishedRevision?.createdAt?.toISOString() ?? null,
      content: enrichPublishedContent(p.publishedRevision?.content ?? null, {
        siteId,
        pageId: p.id,
        path: p.path,
      }),
    })),
  });
}

export const GET = withApiLogging("/api/headless/sites/[siteId]/pages", getPublishedPages);
