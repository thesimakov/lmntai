import { prisma } from "@/lib/prisma";
import { emptyPageDocument, type LemnityBoxCanvasContent, type PageDocument } from "@/lib/lemnity-box-editor-schema";

export function normalizeCmsSlug(raw: string): string {
  const value = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return value || "page";
}

export function normalizeCmsPath(rawPath: string): string {
  const clean = rawPath.trim();
  if (!clean || clean === "/") return "/";
  const parts = clean
    .split("/")
    .map((p) => normalizeCmsSlug(p))
    .filter(Boolean);
  return `/${parts.join("/")}`;
}

export function buildCmsPagePath(parentPath: string | null, slug: string): string {
  const normalizedSlug = normalizeCmsSlug(slug);
  const parent = normalizeCmsPath(parentPath ?? "/");
  if (parent === "/") return `/${normalizedSlug}`;
  return `${parent}/${normalizedSlug}`;
}

export function normalizeCanvasSnapshot(input: unknown): LemnityBoxCanvasContent {
  const val = input as Partial<LemnityBoxCanvasContent> | null | undefined;
  if (!val || typeof val !== "object") return { html: "", css: "" };
  return {
    html: typeof val.html === "string" ? val.html : "",
    css: typeof val.css === "string" ? val.css : "",
  };
}

export function buildPageDocumentFromCanvas(
  title: string,
  content: LemnityBoxCanvasContent | null | undefined,
): PageDocument {
  const doc = emptyPageDocument(title);
  if (content) {
    doc.grapesjs = normalizeCanvasSnapshot(content);
  }
  return doc;
}

export async function requireCmsSiteAccess(siteId: string, userId: string) {
  const site = await prisma.cmsSite.findUnique({
    where: { id: siteId },
    include: {
      members: {
        where: { userId },
        select: { id: true, role: true },
        take: 1,
      },
    },
  });
  if (!site) return null;
  if (site.ownerId === userId) return { site, role: "OWNER" as const };
  const member = site.members[0];
  if (!member) return null;
  return { site, role: member.role };
}

export async function ensureCmsSiteForProject(projectId: string, ownerId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
    select: { id: true, name: true },
  });
  if (!project) throw new Error("PROJECT_NOT_FOUND");

  const existing = await prisma.cmsSite.findUnique({
    where: { projectId: project.id },
    select: { id: true },
  });
  if (existing) return existing;

  const title = project.name?.trim() || "Главная";
  const defaultDoc = buildPageDocumentFromCanvas(title, { html: "", css: "" });

  return prisma.$transaction(async (tx) => {
    const site = await tx.cmsSite.create({
      data: {
        projectId: project.id,
        ownerId,
        name: project.name?.trim() || "Site",
      },
      select: { id: true },
    });

    await tx.cmsSiteMember.create({
      data: {
        siteId: site.id,
        userId: ownerId,
        role: "OWNER",
      },
    });

    const home = await tx.cmsPage.create({
      data: {
        siteId: site.id,
        title,
        slug: "home",
        path: "/",
        isHome: true,
        kind: "page",
        sortOrder: 0,
      },
      select: { id: true },
    });

    const rev = await tx.cmsPageRevision.create({
      data: {
        pageId: home.id,
        siteId: site.id,
        authorId: ownerId,
        version: 1,
        status: "draft",
        content: defaultDoc,
      },
      select: { id: true },
    });

    await tx.cmsPage.update({
      where: { id: home.id },
      data: { draftRevisionId: rev.id },
    });

    return site;
  });
}
