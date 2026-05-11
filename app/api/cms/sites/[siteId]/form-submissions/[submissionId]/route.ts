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

async function patchSubmission(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; submissionId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { siteId, submissionId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  const body = (await req.json().catch(() => null)) as { kanbanColumnKey?: string } | null;
  const nextKey = typeof body?.kanbanColumnKey === "string" ? body.kanbanColumnKey.trim() : "";
  if (!nextKey) {
    return apiError("missing_kanbanColumnKey", 400);
  }

  const site = await prisma.cmsSite.findFirst({
    where: { id: siteId },
    select: { formSubmissionKanbanColumns: true },
  });
  if (!site) return apiError("Not found", 404);

  const custom = parseKanbanCustomColumnsJson(site.formSubmissionKanbanColumns);
  const allowed = collectAllowedKanbanKeys(custom);
  if (!allowed.has(nextKey)) {
    return apiError("invalid_kanbanColumnKey", 400);
  }

  const existing = await prisma.cmsFormSubmission.findFirst({
    where: { id: submissionId, siteId },
    select: { id: true },
  });
  if (!existing) return apiError("Not found", 404);

  await prisma.cmsFormSubmission.update({
    where: { id: submissionId },
    data: { kanbanColumnKey: nextKey },
  });

  return Response.json({ ok: true, kanbanColumnKey: nextKey });
}

export const PATCH = withApiLogging(
  "/api/cms/sites/[siteId]/form-submissions/[submissionId]",
  patchSubmission,
);
