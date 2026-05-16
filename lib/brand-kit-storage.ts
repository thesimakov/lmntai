import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const BRAND_KIT_ROOT = path.join(process.cwd(), ".project-storage", "brand-kit");
const ASSETS_DIR = "assets";

function encodeUserId(userId: string): string {
  return encodeURIComponent(userId.trim());
}

export function getBrandKitUserDir(userId: string): string {
  return path.join(BRAND_KIT_ROOT, encodeUserId(userId));
}

export function getBrandKitAssetPath(userId: string, fileName: string): string {
  return path.join(getBrandKitUserDir(userId), ASSETS_DIR, path.basename(fileName));
}

export function brandKitAssetPublicUrl(assetId: string): string {
  return `/api/brand-kit/assets/${encodeURIComponent(assetId)}`;
}

export function newBrandAssetFileName(assetId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `${assetId}.${safeExt}`;
}

export async function ensureBrandKitDirs(userId: string): Promise<void> {
  await fs.mkdir(path.join(getBrandKitUserDir(userId), ASSETS_DIR), { recursive: true });
}

export async function writeBrandKitAsset(
  userId: string,
  fileName: string,
  data: Buffer
): Promise<void> {
  await ensureBrandKitDirs(userId);
  await fs.writeFile(getBrandKitAssetPath(userId, fileName), data);
}

export async function readBrandKitAsset(userId: string, fileName: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(getBrandKitAssetPath(userId, fileName));
  } catch {
    return null;
  }
}

export async function deleteBrandKitUserStorage(userId: string): Promise<void> {
  await fs.rm(getBrandKitUserDir(userId), { recursive: true, force: true });
}

export function randomAssetId(): string {
  return `asset_${randomBytes(8).toString("hex")}`;
}

export function getBrandKitAssetsDir(userId: string): string {
  return path.join(getBrandKitUserDir(userId), ASSETS_DIR);
}

export async function pruneBrandKitAssets(userId: string, keepFileNames: Set<string>): Promise<void> {
  const dir = getBrandKitAssetsDir(userId);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    entries.map(async (entry) => {
      if (!keepFileNames.has(entry)) {
        await fs.rm(getBrandKitAssetPath(userId, entry), { force: true });
      }
    })
  );
}
