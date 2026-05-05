import { buildLemnityBoxIndexHtml } from "@/lib/lemnity-box-build-index-html";
import type { PageDocument } from "@/lib/lemnity-box-editor-schema";
import { prisma } from "@/lib/prisma";
import { sandboxManager } from "@/lib/sandbox-manager";

export type CmsSandboxSyncResult =
  | { ok: true; skipped?: true; reason?: string }
  | { ok: false; message: string };

function pageDocFromContent(content: unknown): PageDocument | null {
  if (!content || typeof content !== "object") return null;
  const c = content as PageDocument;
  if (c.version !== 1 || !c.grapesjs || typeof c.grapesjs.html !== "string") return null;
  const css = typeof c.grapesjs.css === "string" ? c.grapesjs.css : "";
  return { ...c, grapesjs: { html: c.grapesjs.html, css } };
}

/**
 * После публикации CMS обновляет `index.html` проекта (песочница для /share и поддомена),
 * встраивая скрипт отправки форм в заявки (`cms-form-bridge`).
 *
 * В превью один документ — синхронизируем «целевую» страницу: главную (`isHome` или path `/`),
 * иначе первую опубликованную; при публикации одной страницы — только если это та же целевая или на сайте одна страница.
 */
export async function syncCmsSandboxPreviewWithFormBridge(input: {
  siteId: string;
  /** Публикация одной страницы: обновляем песочницу только если это лендинг превью. */
  triggerPublishedPageId?: string;
}): Promise<CmsSandboxSyncResult> {
  const site = await prisma.cmsSite.findUnique({
    where: { id: input.siteId },
    select: { projectId: true },
  });
  if (!site?.projectId) {
    return { ok: true, skipped: true, reason: "no_project" };
  }

  const publishedCount = await prisma.cmsPage.count({
    where: { siteId: input.siteId, publishedRevisionId: { not: null } },
  });

  let targetPageId: string | null = null;

  if (input.triggerPublishedPageId) {
    const trig = await prisma.cmsPage.findFirst({
      where: { id: input.triggerPublishedPageId, siteId: input.siteId },
      select: { id: true, isHome: true, path: true, publishedRevisionId: true },
    });
    if (!trig?.publishedRevisionId) {
      return { ok: true, skipped: true, reason: "trigger_not_published" };
    }
    const isLanding = trig.isHome || trig.path === "/" || publishedCount <= 1;
    if (!isLanding) {
      return { ok: true, skipped: true, reason: "not_landing_page" };
    }
    targetPageId = trig.id;
  } else {
    const home = await prisma.cmsPage.findFirst({
      where: { siteId: input.siteId, isHome: true, publishedRevisionId: { not: null } },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }],
    });
    if (home) targetPageId = home.id;
    else {
      const root = await prisma.cmsPage.findFirst({
        where: { siteId: input.siteId, path: "/", publishedRevisionId: { not: null } },
        select: { id: true },
      });
      if (root) targetPageId = root.id;
      else {
        const first = await prisma.cmsPage.findFirst({
          where: { siteId: input.siteId, publishedRevisionId: { not: null } },
          orderBy: [{ sortOrder: "asc" }, { path: "asc" }],
          select: { id: true },
        });
        targetPageId = first?.id ?? null;
      }
    }
  }

  if (!targetPageId) {
    return { ok: true, skipped: true, reason: "no_published_pages" };
  }

  const page = await prisma.cmsPage.findFirst({
    where: { id: targetPageId, siteId: input.siteId },
    select: {
      id: true,
      path: true,
      title: true,
      publishedRevision: { select: { content: true } },
    },
  });
  if (!page?.publishedRevision?.content) {
    return { ok: true, skipped: true, reason: "no_revision_content" };
  }

  const doc = pageDocFromContent(page.publishedRevision.content);
  if (!doc?.grapesjs) {
    return { ok: true, skipped: true, reason: "not_grapes_document" };
  }

  const html = buildLemnityBoxIndexHtml(doc.grapesjs, {
    title: page.title.trim() || undefined,
    cmsFormBridge: {
      siteId: input.siteId,
      pageId: page.id,
      pagePath: page.path,
    },
  });

  try {
    await sandboxManager.updateIndexHtml(site.projectId, html);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
