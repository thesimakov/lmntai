import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function listContentTypes(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const rows = await prisma.cmsContentType.findMany({
    where: { siteId },
    orderBy: { updatedAt: "desc" },
    include: {
      fields: {
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: { entries: true },
      },
    },
  });

  return Response.json({
    contentTypes: rows.map((row) => ({
      id: row.id,
      apiKey: row.apiKey,
      name: row.name,
      description: row.description,
      entriesCount: row._count.entries,
      fields: row.fields.map((f) => ({
        id: f.id,
        key: f.key,
        label: f.label,
        fieldType: f.fieldType,
        required: f.required,
        sortOrder: f.sortOrder,
        config: f.config,
      })),
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}

async function createContentType(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return new Response(guard.message, { status: guard.status });
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return new Response("Not found", { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    apiKey?: string;
    name?: string;
    description?: string;
    fields?: Array<{ key?: string; label?: string; fieldType?: string; required?: boolean; config?: unknown }>;
  } | null;

  const apiKey = (body?.apiKey ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!apiKey) return new Response("apiKey is required", { status: 400 });
  const name = body?.name?.trim() || apiKey;
  const fields = Array.isArray(body?.fields) ? body.fields : [];

  try {
    const created = await prisma.$transaction(async (tx) => {
      const ct = await tx.cmsContentType.create({
        data: {
          siteId,
          ownerId: guard.data.user.id,
          apiKey,
          name,
          description: body?.description?.trim() || null,
        },
      });

      if (fields.length > 0) {
        await tx.cmsContentField.createMany({
          data: fields.map((f, idx) => ({
            siteId,
            contentTypeId: ct.id,
            key: (f.key ?? `field_${idx + 1}`)
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9_]+/g, "_")
              .replace(/^_+|_+$/g, ""),
            label: f.label?.trim() || f.key?.trim() || `Field ${idx + 1}`,
            fieldType: f.fieldType?.trim() || "text",
            required: Boolean(f.required),
            sortOrder: idx,
            config: (f.config as object | null | undefined) ?? undefined,
          })),
        });
      }
      return ct;
    });
    return Response.json({ contentTypeId: created.id }, { status: 201 });
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "P2002") return new Response("apiKey already exists", { status: 409 });
    return new Response("Failed to create content type", { status: 500 });
  }
}

export const GET = withApiLogging("/api/cms/sites/[siteId]/content-types", listContentTypes);
export const POST = withApiLogging("/api/cms/sites/[siteId]/content-types", createContentType);
