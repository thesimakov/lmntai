import type { NextRequest } from "next/server";

import { requireAdminUser } from "@/lib/auth-guards";
import { normalizePromoCode } from "@/lib/promo-service";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type BodyUpdate = {
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

async function putOne(req: NextRequest, { params }: Ctx) {
  const g = await requireAdminUser();
  if (!g.ok) {
    return new Response(g.message, { status: g.status });
  }
  const { id } = await params;
  const b = (await req.json().catch(() => null)) as BodyUpdate | null;
  const row = await prisma.promoCode.findUnique({ where: { id } });
  if (!row) {
    return new Response("Not found", { status: 404 });
  }
  const kind = b?.kind === "BONUS_TOKENS" || b?.kind === "DISCOUNT" ? b.kind : row.kind;
  const code =
    typeof b?.code === "string" && b.code.trim() ? normalizePromoCode(b.code) : row.code;
  if (code !== row.code) {
    const taken = await prisma.promoCode.findUnique({ where: { code } });
    if (taken) {
      return Response.json({ error: "duplicate" }, { status: 409 });
    }
  }
  let discountPercent = kind === "DISCOUNT" ? row.discountPercent : null;
  let bonusTokens = kind === "BONUS_TOKENS" ? row.bonusTokens : null;
  if (kind === "DISCOUNT" && b?.discountPercent != null) {
    discountPercent = b.discountPercent;
  } else if (kind === "DISCOUNT" && b?.kind === "DISCOUNT") {
    discountPercent = b.discountPercent ?? row.discountPercent;
  }
  if (kind === "BONUS_TOKENS" && b?.bonusTokens != null) {
    bonusTokens = b.bonusTokens;
  } else if (kind === "BONUS_TOKENS" && b?.kind === "BONUS_TOKENS") {
    bonusTokens = b.bonusTokens ?? row.bonusTokens;
  }
  if (kind === "DISCOUNT" && (typeof discountPercent !== "number" || discountPercent < 1 || discountPercent > 100)) {
    return Response.json({ error: "invalid_discount" }, { status: 400 });
  }
  if (kind === "BONUS_TOKENS" && (typeof bonusTokens !== "number" || bonusTokens < 1)) {
    return Response.json({ error: "invalid_tokens" }, { status: 400 });
  }
  const updated = await prisma.promoCode.update({
    where: { id },
    data: {
      code,
      isActive: typeof b?.isActive === "boolean" ? b.isActive : row.isActive,
      kind,
      discountPercent: kind === "DISCOUNT" ? discountPercent : null,
      bonusTokens: kind === "BONUS_TOKENS" ? bonusTokens : null,
      appliesToPlans: b?.appliesToPlans != null ? parsePlans(b.appliesToPlans) : undefined,
      maxUses: b?.maxUses === undefined || b.maxUses === null ? row.maxUses : b.maxUses > 0 ? b.maxUses : null,
      validFrom: b?.validFrom === undefined ? undefined : b.validFrom ? new Date(b.validFrom) : null,
      validTo: b?.validTo === undefined ? undefined : b.validTo ? new Date(b.validTo) : null
    }
  });
  return Response.json({ item: updated });
}

async function deleteOne(_req: NextRequest, { params }: Ctx) {
  const g = await requireAdminUser();
  if (!g.ok) {
    return new Response(g.message, { status: g.status });
  }
  const { id } = await params;
  try {
    await prisma.promoCode.delete({ where: { id } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
  return new Response(null, { status: 204 });
}

export const PUT = withApiLogging("/api/admin/promo-codes/[id]", putOne);
export const DELETE = withApiLogging("/api/admin/promo-codes/[id]", deleteOne);
