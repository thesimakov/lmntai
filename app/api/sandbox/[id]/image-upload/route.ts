import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { randomBytes } from "crypto";
import { setSandboxImageAsset } from "@/lib/sandbox-image-assets";
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

async function postUpload(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: sandboxId } = await params;
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
  setSandboxImageAsset(sandboxId, key, { mime, data: buf });

  const origin = new URL(req.url).origin;
  const publicUrl = `${origin}/api/sandbox/${encodeURIComponent(sandboxId)}/image-asset/${encodeURIComponent(key)}`;

  return Response.json({ url: publicUrl, key });
}

export const POST = withApiLogging("/api/sandbox/[id]/image-upload", postUpload);
