import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectFromRequest } from "@/lib/project-domain-resolution";
import { getSandboxImageAsset } from "@/lib/sandbox-image-assets";
import { userCanAccessPreviewAssetStorage } from "@/lib/sandbox-preview-asset-access";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getSandboxImage(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const project = await requireProjectFromRequest(req).catch(() => null);
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }
  const { key } = await params;
  const sandboxId = project.id;
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

  const publicOk =
    (await isSandboxLinkPublic(sandboxId).catch(() => false)) &&
    (await sandboxManager.hasSandboxPersistent(sandboxId).catch(() => false));
  if (!publicOk) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(asset.data), { headers });
}

export const GET = withApiLogging("/api/sandbox/image-asset/[key]", getSandboxImage);
