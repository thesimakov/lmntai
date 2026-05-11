import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import {
  newKanbanCustomColumnId,
  parseKanbanCustomColumnsJson,
} from "@/lib/cms-form-submissions-kanban";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function postColumn(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  const body = (await req.json().catch(() => null)) as { label?: string } | null;
  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 120) : "";
  if (label.length < 1) {
    return apiError("missing_label", 400);
  }

  const site = await prisma.cmsSite.findFirst({
    where: { id: siteId },
    select: { id: true, formSubmissionKanbanColumns: true },
  });
  if (!site) return apiError("Not found", 404);

  const current = parseKanbanCustomColumnsJson(site.formSubmissionKanbanColumns);
  if (current.length >= 24) {
    return apiError("too_many_columns", 400);
  }

  const column = { id: newKanbanCustomColumnId(), label };
  const next = [...current, column];

  await prisma.cmsSite.update({
    where: { id: siteId },
    data: { formSubmissionKanbanColumns: next },
  });

  return Response.json({ ok: true, column, kanbanCustomColumns: next });
}

export const POST = withApiLogging("/api/cms/sites/[siteId]/form-submissions/kanban-columns", postColumn);
