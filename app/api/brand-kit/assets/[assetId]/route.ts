import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import { getBrandKitAssetResponse } from "@/lib/brand-kit-service";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getBrandKitAsset(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { assetId } = await params;
  const decodedId = decodeURIComponent(assetId).trim();
  if (!decodedId) {
    return apiError("Not found", 404);
  }

  const asset = await getBrandKitAssetResponse(guard.data.user.id, decodedId);
  if (!asset) {
    return apiError("Not found", 404);
  }

  return new Response(new Uint8Array(asset.buffer), {
    headers: {
      "Content-Type": asset.mime,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const GET = withApiLogging("/api/brand-kit/assets/[assetId]", getBrandKitAsset);
