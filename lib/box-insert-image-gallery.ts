import type { Component, Editor } from "grapesjs";

import { BOX_IMAGE_LIBRARY_FALLBACK } from "@/lib/box-image-library-fallback";

export function escapeAttr(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const DEFAULT_SLOT = BOX_IMAGE_LIBRARY_FALLBACK[8]?.full ?? BOX_IMAGE_LIBRARY_FALLBACK[0]!.full;

/**
 * После выбора кадра в библиотеке: вставляет секцию с сеткой из трёх изображений
 * или заменяет выбранный `<img>` на секцию галереи.
 */
export function insertImageGallerySection(editor: Editor, primarySrcRaw: string) {
  const primary = escapeAttr(primarySrcRaw.trim());
  const slotA = escapeAttr(BOX_IMAGE_LIBRARY_FALLBACK[2]?.full ?? DEFAULT_SLOT);
  const slotB = escapeAttr(BOX_IMAGE_LIBRARY_FALLBACK[5]?.full ?? DEFAULT_SLOT);

  const galleryHtml = `<section data-gjs-name="Галерея" class="lemnity-photo-gallery" style="margin:0;padding:clamp(32px,5vw,56px) clamp(16px,4vw,24px);background:#f8fafc;font-family:system-ui,sans-serif;">
  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,20px);max-width:1100px;margin:0 auto">
    <img src="${primary}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px;display:block"/>
    <img src="${slotA}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px;display:block"/>
    <img src="${slotB}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px;display:block"/>
  </div>
</section>`;

  const selected = editor.getSelected() as Component | undefined;

  if (selected?.is?.("image")) {
    selected.replaceWith(galleryHtml);
    return;
  }

  const wrap = editor.getWrapper();
  if (selected) {
    const parent = selected.parent?.();
    if (parent && typeof selected.index === "function") {
      const idx = selected.index?.() ?? 0;
      parent.append(galleryHtml, { at: idx + 1 });
      return;
    }
  }

  wrap?.append(galleryHtml);
}
