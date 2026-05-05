import { buildLemnityBoxIndexHtml } from "@/lib/lemnity-box-build-index-html";
import type { CmsFormBridgeContext } from "@/lib/cms-form-bridge";
import type { LemnityBoxCanvasContent } from "@/lib/lemnity-box-editor-schema";
import type { PageDocument } from "@/lib/lemnity-box-editor-schema";
import { prisma } from "@/lib/prisma";
import { sandboxManager } from "@/lib/sandbox-manager";

export type CmsSandboxSyncResult =
  | { ok: true; skipped?: true; reason?: string }
  | { ok: false; message: string };

export type CmsPublishedLandingSnapshot = {
  ctx: CmsFormBridgeContext;
  grapesjs: LemnityBoxCanvasContent;
  title: string;
};

function pageDocFromContent(content: unknown): PageDocument | null {
  if (!content || typeof content !== "object") return null;
  const c = content as PageDocument;
  if (c.version !== 1 || !c.grapesjs || typeof c.grapesjs.html !== "string") return null;
  const css = typeof c.grapesjs.css === "string" ? c.grapesjs.css : "";
  return { ...c, grapesjs: { html: c.grapesjs.html, css } };
}

/**
 * Снимок опубликованной «лендинговой» страницы CMS для моста форм и синхронизации превью.
 */
export async function loadCmsPublishedLandingForFormBridge(
  siteId: string,
  options?: { triggerPublishedPageId?: string },
): Promise<CmsPublishedLandingSnapshot | null> {
  const publishedCount = await prisma.cmsPage.count({
    where: { siteId, publishedRevisionId: { not: null } },
  });

  let targetPageId: string | null = null;

  if (options?.triggerPublishedPageId) {
    const trig = await prisma.cmsPage.findFirst({
      where: { id: options.triggerPublishedPageId, siteId },
      select: { id: true, isHome: true, path: true, publishedRevisionId: true },
    });
    if (!trig?.publishedRevisionId) return null;
    const isLanding = trig.isHome || trig.path === "/" || publishedCount <= 1;
    if (!isLanding) return null;
    targetPageId = trig.id;
  } else {
    const home = await prisma.cmsPage.findFirst({
      where: { siteId, isHome: true, publishedRevisionId: { not: null } },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }],
    });
    if (home) targetPageId = home.id;
    else {
      const root = await prisma.cmsPage.findFirst({
        where: { siteId, path: "/", publishedRevisionId: { not: null } },
        select: { id: true },
      });
      if (root) targetPageId = root.id;
      else {
        const first = await prisma.cmsPage.findFirst({
          where: { siteId, publishedRevisionId: { not: null } },
          orderBy: [{ sortOrder: "asc" }, { path: "asc" }],
          select: { id: true },
        });
        targetPageId = first?.id ?? null;
      }
    }
  }

  if (!targetPageId) return null;

  const page = await prisma.cmsPage.findFirst({
    where: { id: targetPageId, siteId },
    select: {
      id: true,
      path: true,
      title: true,
      publishedRevision: { select: { content: true } },
    },
  });
  if (!page?.publishedRevision?.content) return null;

  const doc = pageDocFromContent(page.publishedRevision.content);
  if (!doc?.grapesjs) return null;

  return {
    ctx: {
      siteId,
      pageId: page.id,
      pagePath: page.path,
    },
    grapesjs: doc.grapesjs,
    title: page.title.trim() || "Страница",
  };
}

/** Контекст моста форм для проекта с привязанным CMS-сайтом (лендинг превью). */
export async function resolveCmsFormBridgeContextByProjectId(
  projectId: string,
): Promise<CmsFormBridgeContext | null> {
  const site = await prisma.cmsSite.findUnique({
    where: { projectId },
    select: { id: true },
  });
  if (!site) return null;
  const snap = await loadCmsPublishedLandingForFormBridge(site.id);
  return snap?.ctx ?? null;
}

/**
 * После публикации CMS обновляет `index.html` проекта (песочница для /share и поддомена),
 * встраивая скрипт отправки форм в заявки (`cms-form-bridge`).
 */
export async function syncCmsSandboxPreviewWithFormBridge(input: {
  siteId: string;
  triggerPublishedPageId?: string;
}): Promise<CmsSandboxSyncResult> {
  const site = await prisma.cmsSite.findUnique({
    where: { id: input.siteId },
    select: { projectId: true },
  });
  if (!site?.projectId) {
    return { ok: true, skipped: true, reason: "no_project" };
  }

  const snap = await loadCmsPublishedLandingForFormBridge(input.siteId, {
    triggerPublishedPageId: input.triggerPublishedPageId,
  });
  if (!snap) {
    return { ok: true, skipped: true, reason: "no_landing_snapshot" };
  }

  const html = buildLemnityBoxIndexHtml(snap.grapesjs, {
    title: snap.title,
    cmsFormBridge: snap.ctx,
  });

  try {
    await sandboxManager.updateIndexHtml(site.projectId, html);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
