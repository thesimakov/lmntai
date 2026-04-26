import type { NextRequest } from "next/server";

import { requireAdminUser } from "@/lib/auth-guards";
import { normalizePromoCode } from "@/lib/promo-service";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

async function list(_req: NextRequest) {
  const g = await requireAdminUser();
  if (!g.ok) {
    return new Response(g.message, { status: g.status });
  }
  const rows = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json({ items: rows });
}

type BodyCreate = {
  code?: string;
  kind?: string;
  isActive?: boolean;
  discountPercent?: number | null;
  bonusTokens?: number | null;
  appliesToPlans?: string[] | null;
  maxUses?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
};

function parsePlans(input: string[] | null | undefined): import("@prisma/client").Prisma.InputJsonValue {
  if (!input || !Array.isArray(input) || input.length === 0) {
    return ["PRO", "TEAM"];
  }
  const ok = input.filter((x) => x === "PRO" || x === "TEAM");
  return (ok.length ? ok : ["PRO", "TEAM"]) as unknown as import("@prisma/client").Prisma.InputJsonValue;
}

async function create(req: NextRequest) {
  const g = await requireAdminUser();
  if (!g.ok) {
    return new Response(g.message, { status: g.status });
  }
  const b = (await req.json().catch(() => null)) as BodyCreate | null;
  const code = normalizePromoCode(typeof b?.code === "string" ? b.code : "");
  if (!code) {
    return Response.json({ error: "code_required" }, { status: 400 });
  }
  const kind = b?.kind === "BONUS_TOKENS" || b?.kind === "DISCOUNT" ? b.kind : null;
  if (!kind) {
    return Response.json({ error: "invalid_kind" }, { status: 400 });
  }
  if (kind === "DISCOUNT") {
    const p = b?.discountPercent;
    if (typeof p !== "number" || p < 1 || p > 100) {
      return Response.json({ error: "invalid_discount" }, { status: 400 });
    }
  } else {
    const t = b?.bonusTokens;
    if (typeof t !== "number" || t < 1) {
      return Response.json({ error: "invalid_tokens" }, { status: 400 });
    }
  }
  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing) {
    return Response.json({ error: "duplicate" }, { status: 409 });
  }
  const row = await prisma.promoCode.create({
    data: {
      code,
      isActive: b?.isActive !== false,
      kind,
      discountPercent: kind === "DISCOUNT" ? b!.discountPercent! : null,
      bonusTokens: kind === "BONUS_TOKENS" ? b!.bonusTokens! : null,
      appliesToPlans: parsePlans(b?.appliesToPlans ?? undefined),
      maxUses: typeof b?.maxUses === "number" && b.maxUses > 0 ? b.maxUses : null,
      validFrom: b?.validFrom ? new Date(b.validFrom) : null,
      validTo: b?.validTo ? new Date(b.validTo) : null
    }
  });
  return Response.json({ item: row }, { status: 201 });
}

export const GET = withApiLogging("/api/admin/promo-codes", list);
export const POST = withApiLogging("/api/admin/promo-codes", create);
