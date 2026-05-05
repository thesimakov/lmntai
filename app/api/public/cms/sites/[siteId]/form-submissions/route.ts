import type { NextRequest } from "next/server";

import { normalizeCmsFormSubmissionFields } from "@/lib/cms-form-submissions-server";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

async function postSubmission(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const site = await prisma.cmsSite.findUnique({
    where: { id: siteId },
    select: { id: true },
  });
  if (!site) {
    return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  const b = body as Record<string, unknown>;
  const pageIdRaw = typeof b.pageId === "string" ? b.pageId.trim() : "";
  const pageId = pageIdRaw.length ? pageIdRaw : null;
  const pagePath =
    typeof b.pagePath === "string" ? b.pagePath.trim().slice(0, 512) || null : null;
  const formName =
    typeof b.formName === "string" ? b.formName.trim().slice(0, 160) || null : null;

  if (pageId) {
    const page = await prisma.cmsPage.findFirst({
      where: { id: pageId, siteId },
      select: { id: true },
    });
    if (!page) {
      return new Response(JSON.stringify({ ok: false, error: "bad_page" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  const fields = normalizeCmsFormSubmissionFields(b.fields);
  if (!fields) {
    return new Response(JSON.stringify({ ok: false, error: "bad_fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const ua = req.headers.get("user-agent")?.slice(0, 512) ?? null;
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 80) ?? null;

  const row = await prisma.cmsFormSubmission.create({
    data: {
      siteId,
      pageId,
      pagePath,
      formName,
      fields,
      meta: {
        userAgent: ua,
        ip: fwd,
      },
    },
    select: { id: true, createdAt: true },
  });

  return Response.json(
    { ok: true, id: row.id, createdAt: row.createdAt.toISOString() },
    { headers: corsHeaders },
  );
}

export const POST = withApiLogging(
  "/api/public/cms/sites/[siteId]/form-submissions",
  postSubmission,
);
