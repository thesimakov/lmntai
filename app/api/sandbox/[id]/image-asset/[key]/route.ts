import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { getSandboxImageAsset } from "@/lib/sandbox-image-assets";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getSandboxImage(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; key: string }> }
) {
  const { id: sandboxId, key } = await params;
  const asset = getSandboxImageAsset(sandboxId, key);
  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  const headers = {
    "Content-Type": asset.mime,
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
  };

  const guard = await requireDbUser();
  if (guard.ok) {
    const allowed = await sandboxManager.canAccess(sandboxId, guard.data.user.id);
    if (allowed) {
      return new Response(new Uint8Array(asset.data), { headers });
    }
  }

  let publicOk = false;
  try {
    publicOk = (await isSandboxLinkPublic(sandboxId)) && sandboxManager.hasSandbox(sandboxId);
  } catch {
    publicOk = false;
  }
  if (!publicOk) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(asset.data), { headers });
}

export const GET = withApiLogging("/api/sandbox/[id]/image-asset/[key]", getSandboxImage);
