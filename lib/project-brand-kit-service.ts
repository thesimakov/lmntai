import {
  detectUploadImageMime,
  normalizeUploadImageMime,
  uploadImageExtensionFromMime,
  type UploadImageMime,
} from "@/lib/image-content-validation";
import { prisma } from "@/lib/prisma";
import {
  formatProjectBrandKitForAiPrompt,
  manifestToProjectBrandKitState,
  projectBrandKitManifestSchema,
  projectBrandKitStateToManifest,
  type ProjectBrandKitLibraryDto,
  type ProjectBrandKitManifest,
  type ProjectBrandKitState,
} from "@/lib/project-brand-kit-library";
import {
  deleteProjectBrandKitStorage,
  newProjectBrandAssetFileName,
  projectBrandKitAssetPublicUrl,
  pruneProjectBrandKitAssets,
  readProjectBrandKitAsset,
  writeProjectBrandKitAsset,
} from "@/lib/project-brand-kit-storage";

export type ProjectBrandKitAssetUpload = {
  id: string;
  buffer: Buffer;
  mime: UploadImageMime | "application/pdf";
};

function assetExtension(mime: UploadImageMime | "application/pdf"): string {
  if (mime === "application/pdf") return "pdf";
  return uploadImageExtensionFromMime(mime);
}

function assetUrlsFromManifest(
  projectId: string,
  manifest: ProjectBrandKitManifest
): Record<string, string> {
  const urls: Record<string, string> = {};
  const allAssets = [
    ...manifest.logos,
    ...manifest.images,
    ...(manifest.brandbook ? [manifest.brandbook] : []),
  ];
  for (const asset of allAssets) {
    if (asset.fileName) {
      urls[asset.id] = projectBrandKitAssetPublicUrl(projectId, asset.id);
    }
  }
  return urls;
}

export async function getProjectBrandKit(
  projectId: string
): Promise<ProjectBrandKitLibraryDto | null> {
  const row = await prisma.projectBrandKit.findUnique({
    where: { projectId },
    select: { manifest: true },
  });
  if (!row) return null;

  const parsed = projectBrandKitManifestSchema.safeParse(row.manifest);
  if (!parsed.success) return null;

  return {
    manifest: parsed.data,
    assetUrls: assetUrlsFromManifest(projectId, parsed.data),
  };
}

export async function getProjectBrandKitPromptBlock(
  projectId: string
): Promise<string | null> {
  try {
    const library = await getProjectBrandKit(projectId);
    if (!library) return null;
    return formatProjectBrandKitForAiPrompt(library.manifest);
  } catch {
    return null;
  }
}

export async function saveProjectBrandKit(
  projectId: string,
  state: ProjectBrandKitState,
  uploads: ProjectBrandKitAssetUpload[]
): Promise<ProjectBrandKitLibraryDto> {
  const uploadById = new Map(uploads.map((u) => [u.id, u]));
  const base = projectBrandKitStateToManifest(state);

  const mapAssets = (
    assets: ProjectBrandKitState["logos"]
  ): Array<{ id: string; name: string; fileName?: string }> =>
    assets.map((asset) => {
      const upload = uploadById.get(asset.id);
      if (upload) {
        const fileName = newProjectBrandAssetFileName(asset.id, assetExtension(upload.mime));
        return { id: asset.id, name: asset.name, fileName };
      }
      if (asset.fileName) {
        return { id: asset.id, name: asset.name, fileName: asset.fileName };
      }
      return { id: asset.id, name: asset.name };
    });

  const brandbookRaw = state.brandbook;
  let brandbookManifest: { id: string; name: string; fileName?: string } | null = null;
  if (brandbookRaw) {
    const upload = uploadById.get(brandbookRaw.id);
    if (upload) {
      const fileName = newProjectBrandAssetFileName(brandbookRaw.id, assetExtension(upload.mime));
      brandbookManifest = { id: brandbookRaw.id, name: brandbookRaw.name, fileName };
    } else if (brandbookRaw.fileName) {
      brandbookManifest = { id: brandbookRaw.id, name: brandbookRaw.name, fileName: brandbookRaw.fileName };
    } else {
      brandbookManifest = { id: brandbookRaw.id, name: brandbookRaw.name };
    }
  }

  const manifest: ProjectBrandKitManifest = projectBrandKitManifestSchema.parse({
    version: 1,
    ...base,
    logos: mapAssets(state.logos),
    images: mapAssets(state.images),
    brandbook: brandbookManifest,
    updatedAt: new Date().toISOString(),
  });

  for (const upload of uploads) {
    const fileName = newProjectBrandAssetFileName(upload.id, assetExtension(upload.mime));
    await writeProjectBrandKitAsset(projectId, fileName, upload.buffer);
  }

  const allAssets = [...manifest.logos, ...manifest.images, ...(manifest.brandbook ? [manifest.brandbook] : [])];
  const keptFileNames = new Set(
    allAssets.map((a) => a.fileName).filter((n): n is string => Boolean(n))
  );
  await pruneProjectBrandKitAssets(projectId, keptFileNames);

  await prisma.projectBrandKit.upsert({
    where: { projectId },
    create: { projectId, manifest },
    update: { manifest },
  });

  return {
    manifest,
    assetUrls: assetUrlsFromManifest(projectId, manifest),
  };
}

export async function deleteProjectBrandKit(projectId: string): Promise<void> {
  await prisma.projectBrandKit.deleteMany({ where: { projectId } });
  await deleteProjectBrandKitStorage(projectId);
}

export function libraryDtoToProjectBrandKitState(dto: ProjectBrandKitLibraryDto): ProjectBrandKitState {
  return manifestToProjectBrandKitState(dto.manifest, dto.assetUrls);
}

export async function parseProjectBrandKitAssetUpload(
  file: File,
  assetId: string
): Promise<ProjectBrandKitAssetUpload | null> {
  if (file.size > 20 * 1024 * 1024) return null;
  const buf = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    if (buf[0] !== 0x25 || buf[1] !== 0x50 || buf[2] !== 0x44 || buf[3] !== 0x46) return null;
    return { id: assetId, buffer: buf, mime: "application/pdf" };
  }

  const detectedMime = detectUploadImageMime(buf);
  if (!detectedMime) return null;
  const claimedMime = normalizeUploadImageMime(file.type);
  if (claimedMime && claimedMime !== detectedMime) return null;
  return { id: assetId, buffer: buf, mime: detectedMime };
}

export async function getProjectBrandKitAssetResponse(
  projectId: string,
  assetId: string
): Promise<{ buffer: Buffer; mime: string } | null> {
  const library = await getProjectBrandKit(projectId);
  if (!library) return null;

  const allAssets = [
    ...library.manifest.logos,
    ...library.manifest.images,
    ...(library.manifest.brandbook ? [library.manifest.brandbook] : []),
  ];
  const asset = allAssets.find((a) => a.id === assetId);
  if (!asset?.fileName) return null;

  const buffer = await readProjectBrandKitAsset(projectId, asset.fileName);
  if (!buffer) return null;

  const lower = asset.fileName.toLowerCase();
  let mime = "application/octet-stream";
  if (lower.endsWith(".pdf")) mime = "application/pdf";
  else if (lower.endsWith(".png")) mime = "image/png";
  else if (lower.endsWith(".webp")) mime = "image/webp";
  else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";

  return { buffer, mime };
}
