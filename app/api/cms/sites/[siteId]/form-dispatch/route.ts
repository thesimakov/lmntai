import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import { normalizeFormSubmissionWebhookUrl } from "@/lib/cms-form-submission-webhook";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getDispatch(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  const row = await prisma.cmsSite.findUnique({
    where: { id: siteId },
    select: { formSubmissionWebhookUrl: true },
  });
  const url =
    typeof row?.formSubmissionWebhookUrl === "string" ? row.formSubmissionWebhookUrl : null;

  return Response.json({ formSubmissionWebhookUrl: url });
}

async function patchDispatch(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_json", 400);
  }
  const b = body as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(b, "formSubmissionWebhookUrl")) {
    return apiError("missing_formSubmissionWebhookUrl", 400);
  }
  const v = b.formSubmissionWebhookUrl;
  let nextUrl: string | null;
  if (v === undefined || v === null) nextUrl = null;
  else if (typeof v === "string") {
    const t = v.trim();
    nextUrl = t ? normalizeFormSubmissionWebhookUrl(t) : null;
    if (t && !nextUrl) {
      return apiError("bad_webhook_url", 400);
    }
  } else {
    return Response.json({ error: "bad_webhook_url" }, { status: 400 });
  }

  await prisma.cmsSite.update({
    where: { id: siteId },
    data: { formSubmissionWebhookUrl: nextUrl },
  });

  return Response.json({ ok: true, formSubmissionWebhookUrl: nextUrl });
}

export const GET = withApiLogging("/api/cms/sites/[siteId]/form-dispatch", getDispatch);
export const PATCH = withApiLogging("/api/cms/sites/[siteId]/form-dispatch", patchDispatch);
