import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { apiOk, apiGuardError } from "@/lib/api-response";
import { requireAdminUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest): Promise<Response> {
  const guard = await requireAdminUser();
  if (!guard.ok) return apiGuardError(guard);

  const sp = new URL(req.url).searchParams;

  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const rawLimit = parseInt(sp.get("limit") ?? "50", 10) || 50;
  const limit = Math.min(Math.max(1, rawLimit), 100);

  const source = sp.get("source") ?? undefined;
  const errorType = sp.get("errorType") ?? undefined;
  const module = sp.get("module") ?? undefined;
  const resolvedParam = sp.get("resolved");
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;

  const where: Prisma.ErrorLogWhereInput = {};
  if (source) where.source = source;
  if (errorType) where.errorType = errorType;
  if (module) where.module = module;
  if (resolvedParam !== null) where.resolved = resolvedParam === "true";
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from);
    if (to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(to);
  }

  const [items, total] = await prisma.$transaction([
    prisma.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    prisma.errorLog.count({ where }),
  ]);

  return apiOk({ items, total, page, limit });
}
