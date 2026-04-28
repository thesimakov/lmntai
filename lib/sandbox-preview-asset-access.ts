import { ensureUserCanEditLemnityArtifact } from "@/lib/lemnity-ai-session-links";
import { sandboxManager } from "@/lib/sandbox-manager";

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
