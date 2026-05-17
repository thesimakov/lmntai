import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const BRAND_KIT_ROOT = path.join(process.cwd(), ".project-storage", "brand-kit", "projects");
const ASSETS_DIR = "assets";

export function getProjectBrandKitDir(projectId: string): string {
  return path.join(BRAND_KIT_ROOT, encodeURIComponent(projectId.trim()));
}

export function getProjectBrandKitAssetPath(projectId: string, fileName: string): string {
  return path.join(getProjectBrandKitDir(projectId), ASSETS_DIR, path.basename(fileName));
}

export function projectBrandKitAssetPublicUrl(projectId: string, assetId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/brand-kit/assets/${encodeURIComponent(assetId)}`;
}

export function newProjectBrandAssetFileName(assetId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `${assetId}.${safeExt}`;
}

export function randomProjectBrandAssetId(): string {
  return `asset_${randomBytes(8).toString("hex")}`;
}

async function ensureProjectBrandKitDirs(projectId: string): Promise<void> {
  await fs.mkdir(path.join(getProjectBrandKitDir(projectId), ASSETS_DIR), { recursive: true });
}

export async function writeProjectBrandKitAsset(
  projectId: string,
  fileName: string,
  data: Buffer
): Promise<void> {
  await ensureProjectBrandKitDirs(projectId);
  await fs.writeFile(getProjectBrandKitAssetPath(projectId, fileName), data);
}

export async function readProjectBrandKitAsset(
  projectId: string,
  fileName: string
): Promise<Buffer | null> {
  try {
    return await fs.readFile(getProjectBrandKitAssetPath(projectId, fileName));
  } catch {
    return null;
  }
}

export async function deleteProjectBrandKitStorage(projectId: string): Promise<void> {
  await fs.rm(getProjectBrandKitDir(projectId), { recursive: true, force: true });
}

export async function pruneProjectBrandKitAssets(
  projectId: string,
  keepFileNames: Set<string>
): Promise<void> {
  const dir = path.join(getProjectBrandKitDir(projectId), ASSETS_DIR);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    entries.map(async (entry) => {
      if (!keepFileNames.has(entry)) {
        await fs.rm(getProjectBrandKitAssetPath(projectId, entry), { force: true });
      }
    })
  );
}
