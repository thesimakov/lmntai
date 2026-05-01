import { appendUserVirtualEntry } from "@/lib/user-virtual-storage";
import {
  keepUploadGalleryItems,
  PROJECT_IMAGE_GALLERY_MEDIA_PATH,
  PROJECT_IMAGE_GALLERY_README_PATH,
  PROJECT_IMAGE_GALLERY_README_TEXT,
  stringifyGalleryMedia,
  type ProjectGalleryItem
} from "@/lib/project-image-gallery";
import { clearSandboxMaterializedImageSlots, setSandboxImageAsset } from "@/lib/sandbox-image-assets";

/** Домены, которые сейчас разрешены в промптах (см. lib/prompt-stock-images.ts; Commons — без зарубежного VPN). */
const HOST_ALLOW = new Set([
  "images.unsplash.com",
  "picsum.photos",
  "fastly.picsum.photos",
  "upload.wikimedia.org"
]);

const MAX_IMAGES = 24;
const MAX_IMAGE_BYTES = 2_000_000;
const MAX_TOTAL_BYTES = 8_000_000;

// https://… до конца в типичных JSX/строковых литералах (без жадного перебора)
const CANDIDATE_RE =
  /https:\/\/[a-z0-9][-a-z0-9.]*[a-z0-9](?::[0-9]+)?\/[^\s"'`\\<>)\]]+/gi;

function isAllowedImageUrl(u: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return HOST_ALLOW.has(parsed.hostname);
}

function guessMimeFromUrl(u: string): string | null {
  const lower = u.toLowerCase();
  if (lower.includes(".png") || lower.endsWith("png")) return "image/png";
  if (lower.includes(".webp") || lower.endsWith("webp")) return "image/webp";
  if (lower.includes(".gif") || lower.endsWith("gif")) return "image/gif";
  if (lower.includes("format=png")) return "image/png";
  if (lower.includes("fm=png")) return "image/png";
  return null;
}

async function fetchOne(url: string): Promise<{ buf: Buffer; mime: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; LemnityPreview/1.0; +https://lemnity.com) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;
    if (ct.startsWith("image/")) {
      return { buf, mime: ct };
    }
    const g = guessMimeFromUrl(url);
    if (g) return { buf, mime: g };
    if (buf[0] === 0xff && buf[1] === 0xd8) return { buf, mime: "image/jpeg" };
    if (buf[0] === 0x89 && buf[1] === 0x50) return { buf, mime: "image/png" };
    if (buf[0] === 0x47 && buf[1] === 0x49) return { buf, mime: "image/gif" };
    return null;
  } catch {
    return null;
  }
}

function collectUniqueUrls(projectFiles: Record<string, string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of Object.values(projectFiles)) {
    CANDIDATE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CANDIDATE_RE.exec(text)) !== null) {
      const raw = m[0];
      const u = raw.replace(/[),.;]+$/, "");
      if (!isAllowedImageUrl(u) || seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function replaceAllUrlsInFiles(
  projectFiles: Record<string, string>,
  replacements: Map<string, string>
): Record<string, string> {
  if (replacements.size === 0) return projectFiles;
  const next: Record<string, string> = { ...projectFiles };
  for (const [path, text] of Object.entries(next)) {
    let t = text;
    for (const [from, to] of replacements) {
      if (t.includes(from)) t = t.split(from).join(to);
    }
    next[path] = t;
  }
  return next;
}

export type MaterializeRemoteImagesResult = {
  files: Record<string, string>;
  materializedCount: number;
  skipped: number;
};

/**
 * Скачивает внешние stock-URL в память процесса, подменяет в текстах проекта на
 * Замены в текстах проекта на same-origin `/api/sandbox/:id/image-asset/:key`.
 * Обновляет `public/images/gallery/media.json` (и README в той же папке).
 * Логирует метаданные в UserVirtualEntry (квота — best-effort).
 */
export async function materializeRemoteImagesInProject(
  projectFiles: Record<string, string>,
  ctx: { sandboxId: string; userId: string }
): Promise<MaterializeRemoteImagesResult> {
  const urls = collectUniqueUrls(projectFiles);
  if (urls.length === 0) {
    const uploadsKept = keepUploadGalleryItems(projectFiles);
    if (uploadsKept.length === 0) {
      return { files: projectFiles, materializedCount: 0, skipped: 0 };
    }
    return {
      files: {
        ...projectFiles,
        [PROJECT_IMAGE_GALLERY_README_PATH]: PROJECT_IMAGE_GALLERY_README_TEXT,
        [PROJECT_IMAGE_GALLERY_MEDIA_PATH]: stringifyGalleryMedia({ version: 1, items: uploadsKept })
      },
      materializedCount: 0,
      skipped: 0
    };
  }

  clearSandboxMaterializedImageSlots(ctx.sandboxId);

  const cappedUrls = urls.slice(0, MAX_IMAGES);
  /** Параллельно — иначе N последовательных таймаутов дают минуты «висящей» сборки превью. */
  const fetchRows = await Promise.all(
    cappedUrls.map(async (url) => ({ url, got: await fetchOne(url) }))
  );

  const replacements = new Map<string, string>();
  const manifestItems: Array<{
    sourceUrl: string;
    path: string;
    bytes: number;
    mime: string;
  }> = [];
  let total = 0;
  let keyIdx = 0;
  let skipped = urls.length - cappedUrls.length;

  for (const { url, got } of fetchRows) {
    if (!got) {
      skipped += 1;
      continue;
    }
    if (total + got.buf.length > MAX_TOTAL_BYTES) {
      skipped += 1;
      continue;
    }
    const key = String(keyIdx);
    keyIdx += 1;
    setSandboxImageAsset(ctx.sandboxId, key, { mime: got.mime, data: got.buf });
    const path = `/api/sandbox/${ctx.sandboxId}/image-asset/${key}`;
    replacements.set(url, path);
    total += got.buf.length;
    manifestItems.push({
      sourceUrl: url,
      path,
      bytes: got.buf.length,
      mime: got.mime
    });

    void appendUserVirtualEntry({
      userId: ctx.userId,
      kind: "data",
      content: {
        type: "project_image_materialized",
        virtualFolder: "data/images",
        sourceUrl: url,
        servedPath: path,
        sizeBytes: got.buf.length,
        mime: got.mime
      }
    }).catch(() => {
      // квота / БД — не блокируем превью
    });
  }

  let files = replaceAllUrlsInFiles(projectFiles, replacements);

  const uploadsKept = keepUploadGalleryItems(files);

  const materializedItems: ProjectGalleryItem[] = manifestItems.map((row, idx) => {
    const assetKey = String(idx);
    const path = row.path.startsWith("/") ? row.path : `/${row.path}`;
    return {
      path,
      mime: row.mime,
      source: "materialized",
      assetKey,
      sourceUrl: row.sourceUrl,
      bytes: row.bytes
    };
  });

  files = {
    ...files,
    [PROJECT_IMAGE_GALLERY_README_PATH]: PROJECT_IMAGE_GALLERY_README_TEXT,
    [PROJECT_IMAGE_GALLERY_MEDIA_PATH]: stringifyGalleryMedia({
      version: 1,
      items:
        uploadsKept.length > 0 || materializedItems.length > 0
          ? [...uploadsKept, ...materializedItems]
          : []
    })
  };

  return {
    files,
    materializedCount: manifestItems.length,
    skipped
  };
}
