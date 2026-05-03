import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { isSvgMime } from "@/lib/image-content-validation";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { getSandboxImageAsset } from "@/lib/sandbox-image-assets";
import { userCanAccessPreviewAssetStorage } from "@/lib/sandbox-preview-asset-access";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getSandboxImage(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; key: string }> }
) {
  const { id: routeId, key } = await params;
  const resolvedProject = await resolveProjectFromRequest(req);
  if (resolvedProject && routeId !== resolvedProject.id) {
    return new Response("Not found", { status: 404 });
  }
  const sandboxId = resolvedProject?.id ?? routeId;
  const guard = await requireDbUser();
  let canRead = false;
  if (guard.ok) {
    const allowed = await userCanAccessPreviewAssetStorage(guard.data.user.id, sandboxId);
    if (allowed) {
      canRead = true;
    }
  }

  if (!canRead) {
    let publicOk = false;
    try {
      publicOk = (await isSandboxLinkPublic(sandboxId)) && (await sandboxManager.hasSandboxPersistent(sandboxId));
    } catch {
      publicOk = false;
    }
    canRead = publicOk;
  }
  if (!canRead) {
    return new Response("Not found", { status: 404 });
  }

  const asset = await getSandboxImageAsset(sandboxId, key);
  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": asset.mime,
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff"
  };
  if (isSvgMime(asset.mime)) {
    headers["Content-Disposition"] = "attachment";
  }

  return new Response(new Uint8Array(asset.data), { headers });
}

export const GET = withApiLogging("/api/sandbox/[id]/image-asset/[key]", getSandboxImage);
