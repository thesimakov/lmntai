import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function listSubmissions(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") ?? "80") || 80));

  const rows = await prisma.cmsFormSubmission.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      pageId: true,
      pagePath: true,
      formName: true,
      fields: true,
      createdAt: true,
      page: { select: { title: true, path: true } },
    },
  });

  return Response.json({
    submissions: rows.map((r) => ({
      id: r.id,
      pageId: r.pageId,
      pagePath: r.pagePath,
      pageTitle: r.page?.title ?? null,
      formName: r.formName,
      fields: r.fields,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export const GET = withApiLogging("/api/cms/sites/[siteId]/form-submissions", listSubmissions);
