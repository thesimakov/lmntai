import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import {
  collectAllowedKanbanKeys,
  normalizeSubmissionKanbanKey,
  parseKanbanCustomColumnsJson,
} from "@/lib/cms-form-submissions-kanban";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function listSubmissions(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  const url = new URL(req.url);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") ?? "80") || 80));

  const [rows, siteRow] = await Promise.all([
    prisma.cmsFormSubmission.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        pageId: true,
        pagePath: true,
        formName: true,
        kanbanColumnKey: true,
        fields: true,
        createdAt: true,
        page: { select: { title: true, path: true } },
      },
    }),
    prisma.cmsSite.findFirst({
      where: { id: siteId },
      select: { formSubmissionKanbanColumns: true },
    }),
  ]);

  const kanbanCustomColumns = parseKanbanCustomColumnsJson(siteRow?.formSubmissionKanbanColumns);
  const allowed = collectAllowedKanbanKeys(kanbanCustomColumns);

  return Response.json({
    kanbanCustomColumns,
    submissions: rows.map((r) => ({
      id: r.id,
      pageId: r.pageId,
      pagePath: r.pagePath,
      pageTitle: r.page?.title ?? null,
      formName: r.formName,
      kanbanColumnKey: normalizeSubmissionKanbanKey(r.kanbanColumnKey, allowed),
      fields: r.fields,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export const GET = withApiLogging("/api/cms/sites/[siteId]/form-submissions", listSubmissions);
