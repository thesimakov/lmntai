import type { ProjectBrandKitState } from "@/components/dashboard/project-brand-kit-fields";
import {
  brandKitManifestSchema,
  formatBrandKitForAiPrompt,
  manifestToProjectState,
  projectStateToManifest,
  type BrandKitLibraryDto,
  type BrandKitManifest,
} from "@/lib/brand-kit-library";
import {
  detectUploadImageMime,
  normalizeUploadImageMime,
  uploadImageExtensionFromMime,
  type UploadImageMime,
} from "@/lib/image-content-validation";
import { prisma } from "@/lib/prisma";
import {
  brandKitAssetPublicUrl,
  deleteBrandKitUserStorage,
  ensureBrandKitDirs,
  newBrandAssetFileName,
  pruneBrandKitAssets,
  readBrandKitAsset,
  writeBrandKitAsset,
} from "@/lib/brand-kit-storage";

function assetUrlsFromManifest(manifest: BrandKitManifest): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const asset of [...manifest.logos, ...manifest.images]) {
    if (asset.fileName) {
      urls[asset.id] = brandKitAssetPublicUrl(asset.id);
    }
  }
  return urls;
}

function mimeFromFileName(fileName: string): UploadImageMime {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function getBrandKitLibrary(userId: string): Promise<BrandKitLibraryDto | null> {
  const row = await prisma.userBrandKitLibrary.findUnique({
    where: { userId },
    select: { manifest: true },
  });
  if (!row) return null;

  const parsed = brandKitManifestSchema.safeParse(row.manifest);
  if (!parsed.success) return null;

  return {
    manifest: parsed.data,
    assetUrls: assetUrlsFromManifest(parsed.data),
  };
}

export async function getBrandKitPromptBlock(userId: string): Promise<string | null> {
  try {
    const library = await getBrandKitLibrary(userId);
    if (!library) return null;
    return formatBrandKitForAiPrompt(library.manifest);
  } catch {
    return null;
  }
}

export type SaveAssetUpload = {
  id: string;
  buffer: Buffer;
  mime: UploadImageMime;
};

export async function saveBrandKitLibrary(
  userId: string,
  state: ProjectBrandKitState,
  uploads: SaveAssetUpload[]
): Promise<BrandKitLibraryDto> {
  const uploadById = new Map(uploads.map((u) => [u.id, u]));
  const base = projectStateToManifest(state);

  const mapAssets = (assets: ProjectBrandKitState["logos"]) =>
    assets.map((asset) => {
      const upload = uploadById.get(asset.id);
      if (upload) {
        const fileName = newBrandAssetFileName(asset.id, uploadImageExtensionFromMime(upload.mime));
        return { id: asset.id, name: asset.name, fileName };
      }
      if (asset.fileName) {
        return { id: asset.id, name: asset.name, fileName: asset.fileName };
      }
      return { id: asset.id, name: asset.name };
    });

  const manifest: BrandKitManifest = brandKitManifestSchema.parse({
    version: 1,
    ...base,
    logos: mapAssets(state.logos),
    images: mapAssets(state.images),
    updatedAt: new Date().toISOString(),
  });

  await ensureBrandKitDirs(userId);

  for (const upload of uploads) {
    const fileName = newBrandAssetFileName(upload.id, uploadImageExtensionFromMime(upload.mime));
    await writeBrandKitAsset(userId, fileName, upload.buffer);
  }

  const keptFileNames = new Set(
    [...manifest.logos, ...manifest.images]
      .map((a) => a.fileName)
      .filter((name): name is string => Boolean(name))
  );
  await pruneBrandKitAssets(userId, keptFileNames);

  await prisma.userBrandKitLibrary.upsert({
    where: { userId },
    create: { userId, manifest },
    update: { manifest },
  });

  return {
    manifest,
    assetUrls: assetUrlsFromManifest(manifest),
  };
}

export async function deleteBrandKitLibrary(userId: string): Promise<void> {
  await prisma.userBrandKitLibrary.deleteMany({ where: { userId } });
  await deleteBrandKitUserStorage(userId);
}

export function libraryDtoToProjectState(dto: BrandKitLibraryDto): ProjectBrandKitState {
  return manifestToProjectState(dto.manifest, dto.assetUrls);
}

export async function parseBrandKitAssetUpload(
  file: File,
  assetId: string
): Promise<SaveAssetUpload | null> {
  if (file.size > 6 * 1024 * 1024) return null;
  const buf = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectUploadImageMime(buf);
  if (!detectedMime) return null;
  const claimedMime = normalizeUploadImageMime(file.type);
  if (claimedMime && claimedMime !== detectedMime) return null;
  return { id: assetId, buffer: buf, mime: detectedMime };
}

export async function getBrandKitAssetResponse(
  userId: string,
  assetId: string
): Promise<{ buffer: Buffer; mime: UploadImageMime } | null> {
  const library = await getBrandKitLibrary(userId);
  if (!library) return null;

  const asset = [...library.manifest.logos, ...library.manifest.images].find((a) => a.id === assetId);
  if (!asset?.fileName) return null;

  const buffer = await readBrandKitAsset(userId, asset.fileName);
  if (!buffer) return null;

  return { buffer, mime: mimeFromFileName(asset.fileName) };
}
