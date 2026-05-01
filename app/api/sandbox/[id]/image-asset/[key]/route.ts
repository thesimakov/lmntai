import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
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
  const asset = await getSandboxImageAsset(sandboxId, key);
  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  const headers = {
    "Content-Type": asset.mime,
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
  };

  const guard = await requireDbUser();
  if (guard.ok) {
    const allowed = await userCanAccessPreviewAssetStorage(guard.data.user.id, sandboxId);
    if (allowed) {
      return new Response(new Uint8Array(asset.data), { headers });
    }
  }

  let publicOk = false;
  try {
    publicOk = (await isSandboxLinkPublic(sandboxId)) && (await sandboxManager.hasSandboxPersistent(sandboxId));
  } catch {
    publicOk = false;
  }
  if (!publicOk) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(asset.data), { headers });
}

export const GET = withApiLogging("/api/sandbox/[id]/image-asset/[key]", getSandboxImage);
