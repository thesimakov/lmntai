import JSZip from "jszip";

import { prisma } from "@/lib/prisma";
import { collectProjectStorageFiles, readProjectFilesSnapshot } from "@/lib/project-storage";
import { requireProjectScopeForOwner } from "@/lib/project-context";

export async function exportProject(
  projectId: string,
  ownerId: string
): Promise<{ filename: string; data: Buffer }> {
  const scope = await requireProjectScopeForOwner(projectId, ownerId);

  const [
    sandboxState,
    share,
    publishDomains,
    sessionLink,
    chatCharges,
    messageLogs,
    embeddingLogs,
    actionLogs,
    imageAssets,
    tokenUsageLogs
  ] = await Promise.all([
    prisma.sandboxProjectState.findFirst({
      where: { projectId: scope.projectId },
      select: {
        sandboxId: true,
        title: true,
        html: true,
        files: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.sandboxShare.findFirst({
      where: { projectId: scope.projectId },
      select: {
        sandboxId: true,
        ownerId: true,
        isPublic: true,
        hideLemnityHeader: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.publishDomainBinding.findMany({
      where: { projectId: scope.projectId },
      orderBy: { createdAt: "asc" },
      select: {
        host: true,
        sandboxId: true,
        ownerId: true,
        isActive: true,
        verificationStatus: true,
        verificationToken: true,
        verifiedAt: true,
        lastVerificationAt: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.manusSessionLink.findFirst({
      where: { projectId: scope.projectId },
      select: {
        manusSessionId: true,
        title: true,
        latestMessage: true,
        latestMessageAt: true,
        unreadMessageCount: true,
        status: true,
        isShared: true,
        previewArtifactId: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.manusChatCharge.findMany({
      where: { projectId: scope.projectId },
      orderBy: { createdAt: "asc" },
      select: {
        manusSessionId: true,
        eventId: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        createdAt: true
      }
    }),
    prisma.projectMessage.findMany({
      where: { projectId: scope.projectId },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        content: true,
        metadata: true,
        createdAt: true
      }
    }),
    prisma.projectEmbedding.findMany({
      where: { projectId: scope.projectId },
      orderBy: { createdAt: "asc" },
      select: {
        namespace: true,
        vectorRef: true,
        metadata: true,
        createdAt: true
      }
    }),
    prisma.projectActionLog.findMany({
      where: { projectId: scope.projectId },
      orderBy: { createdAt: "asc" },
      select: {
        action: true,
        payload: true,
        createdAt: true
      }
    }),
    prisma.projectImageAsset.findMany({
      where: { projectId: scope.projectId },
      orderBy: { createdAt: "asc" },
      select: {
        assetKey: true,
        mime: true,
        bytes: true,
        source: true,
        sourceUrl: true,
        createdAt: true
      }
    }),
    prisma.tokenUsageLog.findMany({
      where: { projectId: scope.projectId },
      orderBy: { createdAt: "asc" },
      select: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        model: true,
        createdAt: true
      }
    })
  ]);

  const filesSnapshot = await readProjectFilesSnapshot(scope.projectId);
  const storageFiles = await collectProjectStorageFiles(scope.projectId);

  const zip = new JSZip();
  const exportRoot = `project-${scope.projectId}`;

  zip.file(
    `${exportRoot}/manifest.json`,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        project: {
          id: scope.projectId,
          ownerId: scope.ownerId,
          name: scope.name,
          createdAt: scope.createdAt.toISOString()
        },
        vectorNamespace: scope.projectId
      },
      null,
      2
    )}\n`
  );

  zip.file(`${exportRoot}/db/sandbox-state.json`, `${JSON.stringify(sandboxState, null, 2)}\n`);
  zip.file(`${exportRoot}/db/share.json`, `${JSON.stringify(share, null, 2)}\n`);
  zip.file(`${exportRoot}/db/publish-domains.json`, `${JSON.stringify(publishDomains, null, 2)}\n`);
  zip.file(`${exportRoot}/db/session-link.json`, `${JSON.stringify(sessionLink, null, 2)}\n`);
  zip.file(`${exportRoot}/db/chat-charges.json`, `${JSON.stringify(chatCharges, null, 2)}\n`);
  zip.file(`${exportRoot}/db/messages.json`, `${JSON.stringify(messageLogs, null, 2)}\n`);
  zip.file(`${exportRoot}/db/embeddings.json`, `${JSON.stringify(embeddingLogs, null, 2)}\n`);
  zip.file(`${exportRoot}/db/actions.json`, `${JSON.stringify(actionLogs, null, 2)}\n`);
  zip.file(`${exportRoot}/db/image-assets.json`, `${JSON.stringify(imageAssets, null, 2)}\n`);
  zip.file(`${exportRoot}/db/token-usage.json`, `${JSON.stringify(tokenUsageLogs, null, 2)}\n`);
  zip.file(`${exportRoot}/files/snapshot.json`, `${JSON.stringify(filesSnapshot, null, 2)}\n`);

  for (const row of storageFiles) {
    zip.file(`${exportRoot}/${row.relPath}`, row.data);
  }

  const data = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  const safeName = scope.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "project";
  return {
    filename: `${safeName}-${scope.projectId}.zip`,
    data
  };
}
