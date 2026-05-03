import { ensureUserCanEditLemnityArtifact } from "@/lib/lemnity-ai-session-links";
import { prisma } from "@/lib/prisma";
import { sandboxManager } from "@/lib/sandbox-manager";

/**
 * Превью-хранилище ключаётся по `artifact_*`, строки в БД (`ProjectImageAsset.projectId`) — по реальному {@link Project.id}.
 */
export async function resolveProjectIdForImageAssetRow(userId: string, storageId: string): Promise<string> {
  if (!storageId.startsWith("artifact_")) {
    return storageId;
  }
  const row = await prisma.manusSessionLink.findFirst({
    where: { userId, previewArtifactId: storageId },
    select: { projectId: true }
  });
  if (!row) {
    throw new Error("IMAGE_ASSET_DB_PROJECT_RESOLVE_FAILED");
  }
  return row.projectId;
}

/**
 * Загрузка и раздача `/api/sandbox/:id/image-*`: обычная песочница или артефакт превью `artifact_*` (Lemnity AI).
 */
export async function userCanAccessPreviewAssetStorage(userId: string, storageId: string): Promise<boolean> {
  if (storageId.startsWith("artifact_")) {
    try {
      await ensureUserCanEditLemnityArtifact(userId, storageId);
      return true;
    } catch {
      return false;
    }
  }
  return sandboxManager.canAccess(storageId, userId);
}
