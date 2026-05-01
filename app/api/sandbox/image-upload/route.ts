import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";

import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectFromRequest } from "@/lib/project-domain-resolution";
import { setSandboxImageAsset } from "@/lib/sandbox-image-assets";
import { sandboxManager } from "@/lib/sandbox-manager";
import { userCanAccessPreviewAssetStorage } from "@/lib/sandbox-preview-asset-access";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

const ALLOWED = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"]
]);

async function postUpload(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const project = await requireProjectFromRequest(req).catch(() => null);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  const sandboxId = project.id;
  const allowed = await userCanAccessPreviewAssetStorage(guard.data.user.id, sandboxId);
  if (!allowed) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File too large" }, { status: 413 });
  }

  const mime = file.type || "application/octet-stream";
  const ext = ALLOWED.get(mime);
  if (!ext) {
    return Response.json({ error: "Unsupported image type" }, { status: 415 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const key = `img_${randomBytes(10).toString("hex")}.${ext}`;
  await setSandboxImageAsset(sandboxId, key, { mime, data: buf }, "upload");

  const origin = new URL(req.url).origin;
  const publicUrl = `${origin}/api/sandbox/image-asset/${encodeURIComponent(key)}`;

  try {
    const pathOnly = `/api/sandbox/image-asset/${encodeURIComponent(key)}`;
    await sandboxManager.mergeProjectGalleryAppendUploadItem(sandboxId, {
      path: pathOnly,
      mime,
      source: "upload",
      assetKey: key,
      bytes: buf.length
    });
  } catch {
    // non-blocking
  }

  return Response.json({ url: publicUrl, key });
}

export const POST = withApiLogging("/api/sandbox/image-upload", postUpload);
