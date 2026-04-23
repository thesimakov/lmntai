import type { NextRequest } from "next/server";

import { requireAdminUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  buildTariffEconomics,
  DEFAULT_TARIFF_PRICES_RUB,
  estimateUsageCostRub,
  MODEL_COGS_RUB_PER_1M
} from "@/lib/pricing-economics";
import { withApiLogging } from "@/lib/with-api-logging";

async function getAdminEconomics(req: NextRequest) {
  void req;
  const guard = await requireAdminUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);

  const byModel = await prisma.tokenUsageLog.groupBy({
    by: ["model"],
    where: { createdAt: { gte: last30 } },
    _sum: { totalTokens: true }
  });

  const usage = byModel.map((item) => {
    const tokens = item._sum.totalTokens ?? 0;
    return {
      model: item.model,
      totalTokens: tokens,
      estimatedCostRub: estimateUsageCostRub(item.model, tokens),
      configuredRubPer1M: MODEL_COGS_RUB_PER_1M[item.model] ?? null
    };
  });

  const estimatedUsageCostRubLast30d = usage.reduce((acc, x) => acc + x.estimatedCostRub, 0);

  return Response.json({
    projectedTariffEconomics: buildTariffEconomics(DEFAULT_TARIFF_PRICES_RUB),
    usageCostLast30d: {
      totalEstimatedCostRub: estimatedUsageCostRubLast30d,
      byModel: usage
    }
  });
}

export const GET = withApiLogging("/api/admin/economics", getAdminEconomics);
