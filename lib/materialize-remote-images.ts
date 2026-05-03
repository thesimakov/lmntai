import { appendUserVirtualEntry } from "@/lib/user-virtual-storage";
import { detectRasterImageMime } from "@/lib/image-content-validation";
import {
  keepUploadGalleryItems,
  PROJECT_IMAGE_GALLERY_README_TEXT,
  projectImageGalleryMediaPath,
  projectImageGalleryReadmePath,
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
const MAX_REDIRECTS = 4;

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

async function fetchOne(url: string): Promise<{ buf: Buffer; mime: string } | null> {
  try {
    let current = new URL(url);
    if (!isAllowedImageUrl(current.toString())) return null;
    const signal = AbortSignal.timeout(10_000);
    let res: Response | null = null;

    for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
      res = await fetch(current.toString(), {
        redirect: "manual",
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (compatible; LemnityPreview/1.0; +https://lemnity.com) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        const next = new URL(location, current);
        if (!isAllowedImageUrl(next.toString())) return null;
        current = next;
        continue;
      }
      break;
    }

    if (!res) return null;
    if (res.status >= 300 && res.status < 400) return null;
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;
    const mime = detectRasterImageMime(buf);
    if (!mime) return null;
    const ct = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (ct.startsWith("image/") && ct !== mime && !(ct === "image/jpg" && mime === "image/jpeg")) {
      return null;
    }
    return { buf, mime };
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
  ctx: { projectId: string; userId: string }
): Promise<MaterializeRemoteImagesResult> {
  const galleryReadmePath = projectImageGalleryReadmePath(ctx.projectId);
  const galleryMediaPath = projectImageGalleryMediaPath(ctx.projectId);
  const urls = collectUniqueUrls(projectFiles);
  if (urls.length === 0) {
    const uploadsKept = keepUploadGalleryItems(projectFiles, ctx.projectId);
    if (uploadsKept.length === 0) {
      return { files: projectFiles, materializedCount: 0, skipped: 0 };
    }
    return {
      files: {
        ...projectFiles,
        [galleryReadmePath]: PROJECT_IMAGE_GALLERY_README_TEXT,
        [galleryMediaPath]: stringifyGalleryMedia({ version: 1, items: uploadsKept })
      },
      materializedCount: 0,
      skipped: 0
    };
  }

  await clearSandboxMaterializedImageSlots(ctx.projectId);

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
    await setSandboxImageAsset(ctx.projectId, key, { mime: got.mime, data: got.buf }, "materialized", url);
    const path = `/api/sandbox/${ctx.projectId}/image-asset/${key}`;
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
      projectId: ctx.projectId,
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

  const uploadsKept = keepUploadGalleryItems(files, ctx.projectId);

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
    [galleryReadmePath]: PROJECT_IMAGE_GALLERY_README_TEXT,
    [galleryMediaPath]: stringifyGalleryMedia({
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
