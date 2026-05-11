import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import {
  detectUploadImageMime,
  normalizeUploadImageMime,
  uploadImageExtensionFromMime
} from "@/lib/image-content-validation";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { randomBytes } from "crypto";
import { setSandboxImageAsset } from "@/lib/sandbox-image-assets";
import { sandboxManager } from "@/lib/sandbox-manager";
import {
  resolveProjectIdForImageAssetRow,
  userCanAccessPreviewAssetStorage
} from "@/lib/sandbox-preview-asset-access";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

async function postUpload(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return apiGuardError(guard);
  }
  const { id: routeId } = await params;
  const resolvedProject = await resolveProjectFromRequest(req);
  if (resolvedProject && routeId !== resolvedProject.id) {
    return apiError("Not found", 404);
  }
  const sandboxId = resolvedProject?.id ?? routeId;
  const allowed = await userCanAccessPreviewAssetStorage(guard.data.user.id, sandboxId);
  if (!allowed) {
    return apiError("Not found", 404);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Bad request", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError("Missing file", 400);
  }

  if (file.size > MAX_BYTES) {
    return apiError("File too large", 413);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectUploadImageMime(buf);
  if (!detectedMime) {
    return apiError("Unsupported image type", 415);
  }
  const claimedMime = normalizeUploadImageMime(file.type);
  if (claimedMime && claimedMime !== detectedMime) {
    return apiError("MIME type mismatch", 415);
  }
  const mime = detectedMime;
  const ext = uploadImageExtensionFromMime(mime);
  const key = `img_${randomBytes(10).toString("hex")}.${ext}`;
  let rowProjectId: string;
  try {
    rowProjectId = await resolveProjectIdForImageAssetRow(guard.data.user.id, sandboxId);
  } catch {
    return apiError("Not found", 404);
  }
  await setSandboxImageAsset(sandboxId, key, { mime, data: buf }, "upload", undefined, {
    dbProjectId: rowProjectId
  });

  /** Same-origin путь: не привязываемся к `req.url` (за прокси там бывает 0.0.0.0 и т.п.). */
  const publicUrl = `/api/sandbox/${encodeURIComponent(sandboxId)}/image-asset/${encodeURIComponent(key)}`;

  try {
    await sandboxManager.mergeProjectGalleryAppendUploadItem(sandboxId, {
      path: publicUrl,
      mime,
      source: "upload",
      assetKey: key,
      bytes: buf.length
    });
  } catch {
    // не блокируем ответ с URL, если список галереи не сохранился
  }

  return Response.json({ url: publicUrl, key });
}

export const POST = withApiLogging("/api/sandbox/[id]/image-upload", postUpload);
