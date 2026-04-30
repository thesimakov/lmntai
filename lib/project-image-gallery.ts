/**
 * Единый каталог сайта для изображений проекта превью: `public/images/gallery/`.
 * Бинарные данные живут в `image-asset`; в файлах — только JSON‑метаданные (для «Файлы проекта» и галереи).
 */

export const PROJECT_IMAGE_GALLERY_DIR = "public/images/gallery";

export const PROJECT_IMAGE_GALLERY_README_PATH = `${PROJECT_IMAGE_GALLERY_DIR}/README.txt`;

export const PROJECT_IMAGE_GALLERY_MEDIA_PATH = `${PROJECT_IMAGE_GALLERY_DIR}/media.json`;

export const PROJECT_IMAGE_GALLERY_README_TEXT =
  "Эта папка — галерея изображений текущего превью.\n" +
  "Файлы `media.json` и манифесты перечисляют same-origin пути `/api/sandbox/…/image-asset/…`.\n" +
  "Изображения хранятся на сервере; код ссылается на эти пути в превью и в списке файлов.\n";

export type ProjectGalleryItem = {
  path: string;
  mime: string;
  /** Скачанный stock‑URL или загрузка из редактора */
  source: "materialized" | "upload";
  /** Совпадает с ключом в sandbox image‑asset (цифровой или `img_*.jpg`) */
  assetKey?: string;
  /** Для материализованных — откуда брали картинку */
  sourceUrl?: string;
  bytes?: number;
};

export type ProjectGalleryMediaV1 = {
  version: 1;
  updatedAt?: string;
  items: ProjectGalleryItem[];
};

export function parseGalleryMediaJson(raw: string | undefined): ProjectGalleryMediaV1 | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as unknown;
    if (typeof j !== "object" || j === null || !Array.isArray((j as { items?: unknown }).items)) {
      return null;
    }
    const items = ((j as { items: unknown[] }).items ?? [])
      .filter(
        (x): x is ProjectGalleryItem =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as { path?: unknown }).path === "string" &&
          typeof (x as { mime?: unknown }).mime === "string" &&
          typeof (x as { source?: unknown }).source === "string"
      )
      .map((x) => ({
        path: String((x as ProjectGalleryItem).path),
        mime: String((x as ProjectGalleryItem).mime),
        source:
          (x as ProjectGalleryItem).source === "upload" ||
          (x as ProjectGalleryItem).source === "materialized"
            ? (x as ProjectGalleryItem).source
            : "materialized",
        assetKey:
          typeof (x as ProjectGalleryItem).assetKey === "string"
            ? (x as ProjectGalleryItem).assetKey
            : undefined,
        sourceUrl:
          typeof (x as ProjectGalleryItem).sourceUrl === "string"
            ? (x as ProjectGalleryItem).sourceUrl
            : undefined,
        bytes:
          typeof (x as ProjectGalleryItem).bytes === "number"
            ? (x as ProjectGalleryItem).bytes
            : undefined
      }));
    return { version: 1, items };
  } catch {
    return null;
  }
}

/** Восстановить записи только пользовательских загрузок между перегенерациями кода */
export function keepUploadGalleryItems(previousFiles: Record<string, string>): ProjectGalleryItem[] {
  const prev = parseGalleryMediaJson(previousFiles[PROJECT_IMAGE_GALLERY_MEDIA_PATH]);
  const items = prev?.items?.filter((i) => i.source === "upload") ?? [];
  const seen = new Set<string>();
  const out: ProjectGalleryItem[] = [];
  for (const item of items) {
    const k = `${item.path}\0${item.assetKey ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function stringifyGalleryMedia(m: ProjectGalleryMediaV1): string {
  return `${JSON.stringify(
    {
      ...m,
      updatedAt: new Date().toISOString()
    },
    null,
    2
  )}\n`;
}

export function appendGalleryUploadItem(
  prev: ProjectGalleryMediaV1 | null,
  item: ProjectGalleryItem
): ProjectGalleryMediaV1 {
  const items = prev?.items ?? [];
  const rest = items.filter(
    (i) => !(i.path === item.path && (i.assetKey ?? "") === (item.assetKey ?? ""))
  );
  return { version: 1, items: [...rest, item] };
}
