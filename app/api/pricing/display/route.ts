import type { NextRequest } from "next/server";

import { buildPricingDisplay } from "@/lib/pricing-display";
import { withApiLogging } from "@/lib/with-api-logging";

async function getPricingDisplay(req: NextRequest) {
  const url = new URL(req.url);
  const payload = buildPricingDisplay(url.searchParams.get("lang"));
  return Response.json(payload);
}

export const GET = withApiLogging("/api/pricing/display", getPricingDisplay);
