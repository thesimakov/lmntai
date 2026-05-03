/**
 * Ассеты изображений превью: файловая изоляция по проекту + индекс в БД.
 * Больше нет глобального in-memory хранилища.
 */

import { promises as fs } from "node:fs";

import { prisma } from "@/lib/prisma";
import {
  clearProjectImageAssets,
  getProjectStorageImagePath,
  readProjectImageAsset,
  writeProjectImageAsset
} from "@/lib/project-storage";

export type StoredImageAsset = {
  mime: string;
  data: Buffer;
};

export async function setSandboxImageAsset(
  projectId: string,
  key: string,
  asset: StoredImageAsset,
  source: "materialized" | "upload" = "upload",
  sourceUrl?: string,
  opts?: { dbProjectId?: string }
): Promise<void> {
  await writeProjectImageAsset({
    projectId,
    assetKey: key,
    mime: asset.mime,
    data: asset.data
  });
  const rowProjectId = opts?.dbProjectId ?? projectId;
  await prisma.projectImageAsset.upsert({
    where: {
      projectId_assetKey: {
        projectId: rowProjectId,
        assetKey: key
      }
    },
    create: {
      projectId: rowProjectId,
      assetKey: key,
      mime: asset.mime,
      bytes: asset.data.length,
      source,
      sourceUrl: sourceUrl ?? null
    },
    update: {
      mime: asset.mime,
      bytes: asset.data.length,
      source,
      sourceUrl: sourceUrl ?? null
    }
  });
}

export async function getSandboxImageAsset(
  projectId: string,
  key: string
): Promise<StoredImageAsset | undefined> {
  const asset = await readProjectImageAsset(projectId, key);
  return asset ?? undefined;
}

export async function clearSandboxImageAssets(projectId: string): Promise<void> {
  await clearProjectImageAssets(projectId);
  await prisma.projectImageAsset.deleteMany({ where: { projectId } });
}

/** Удалить только ключи‑слоты `0`,`1`,`2`,… перед новой порцией материализованных URL. */
export async function clearSandboxMaterializedImageSlots(projectId: string): Promise<void> {
  const rows = await prisma.projectImageAsset.findMany({
    where: { projectId },
    select: { assetKey: true }
  });
  const keys = rows.map((row) => row.assetKey).filter((k) => /^\d+$/.test(k));
  if (!keys.length) return;
  await Promise.all(
    keys.map(async (key) => {
      const imagePath = getProjectStorageImagePath(projectId, key);
      await fs.rm(imagePath, { force: true });
      await fs.rm(`${imagePath}.meta.json`, { force: true });
    })
  );
  await prisma.projectImageAsset.deleteMany({
    where: {
      projectId,
      assetKey: { in: keys }
    }
  });
}
