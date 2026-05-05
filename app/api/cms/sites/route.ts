import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { ensureCmsSiteForProject } from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function listSites(req: NextRequest) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });

  const userId = guard.data.user.id;
  const rows = await prisma.cmsSite.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      project: { select: { id: true, name: true, subdomain: true } },
      pages: { select: { id: true } },
    },
  });

  return Response.json({
    sites: rows.map((s) => ({
      id: s.id,
      name: s.name,
      projectId: s.projectId,
      defaultLocale: s.defaultLocale,
      pagesCount: s.pages.length,
      updatedAt: s.updatedAt.toISOString(),
      project: s.project,
    })),
  });
}

async function createOrEnsureSite(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const body = (await req.json().catch(() => null)) as { projectId?: string } | null;
  const projectId = body?.projectId?.trim();
  if (!projectId) return new Response("projectId is required", { status: 400 });

  try {
    const site = await ensureCmsSiteForProject(projectId, guard.data.user.id);
    return Response.json({ siteId: site.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_NOT_FOUND") return new Response("Not found", { status: 404 });
    return new Response(msg || "Error", { status: 500 });
  }
}

export const GET = withApiLogging("/api/cms/sites", listSites);
export const POST = withApiLogging("/api/cms/sites", createOrEnsureSite);
