import type { NextRequest } from "next/server";

import { requireAdminUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { getPlatformPlanData, savePlatformPlanData, type PlatformPlanDataV1 } from "@/lib/platform-plan-settings";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";

async function getPlanConfig(req: NextRequest) {
  void req;
  const guard = await requireAdminUser();
  if (!guard.ok) {
    return apiGuardError(guard);
  }
  const data = await getPlatformPlanData();
  return Response.json(data);
}

export const GET = withApiLogging("/api/admin/plan-config", getPlanConfig);

async function putPlanConfig(req: NextRequest) {
  const guard = await requireAdminUser();
  if (!guard.ok) {
    return apiGuardError(guard);
  }
  const body = (await req.json().catch(() => null)) as PlatformPlanDataV1 | null;
  if (!body || body.version !== 1) {
    return apiError("Invalid body", 400);
  }
  const saved = await savePlatformPlanData(body);
  return Response.json(saved);
}

export const PUT = withApiLogging("/api/admin/plan-config", putPlanConfig);
