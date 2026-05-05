"use client";

import type { Editor } from "grapesjs";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LemnityBoxBlockLibraryEntry, LemnityBoxLibraryVariant } from "@/components/playground/lemnity-box/lemnity-box-block-registry";
import { LEMNITY_BOX_BLOCK_LIBRARIES } from "@/components/playground/lemnity-box/lemnity-box-block-registry";

type LemnityBoxBlockLibraryFlyoutProps = {
  blockId: string;
  getEditor: () => Editor | null;
  onClose: () => void;
  /** false, когда панель блоков свернута — флайот клеится к левому краю холста */
  blocksPanelVisible?: boolean;
  /**
   * Слот для вставки на корневом wrapper (из зоны «Добавить блок» на холсте).
   * Вызывается один раз при вставке из flyout и сбрасывает сохранённый индекс.
   */
  consumePendingInsertIndex?: () => number | null;
};

export function LemnityBoxBlockLibraryFlyout({
  blockId,
  getEditor,
  onClose,
  blocksPanelVisible = true,
  consumePendingInsertIndex,
}: LemnityBoxBlockLibraryFlyoutProps) {
  const entry: LemnityBoxBlockLibraryEntry | undefined = LEMNITY_BOX_BLOCK_LIBRARIES[blockId];
  const variants = useMemo(() => entry?.variants ?? [], [entry]);

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const insertVariant = useCallback(
    (v: LemnityBoxLibraryVariant) => {
      const editor = getEditor();
      if (!editor) return;
      const slot = consumePendingInsertIndex?.() ?? null;
      const wrapper = editor.getWrapper();
      if (slot != null && wrapper) {
        wrapper.append(v.content, { at: slot });
      } else {
        editor.addComponents(v.content);
      }
      editor.refresh();
      onClose();
    },
    [consumePendingInsertIndex, getEditor, onClose],
  );

  if (!entry) return null;

  const flyoutLeft = blocksPanelVisible ? "left-[227px]" : "left-0";
  const flyoutWidth = blocksPanelVisible ? "w-[min(320px,calc(100%-227px))]" : "w-[min(320px,100%)]";

  return (
    <>
      <button
        type="button"
        className={`absolute bottom-0 right-0 top-0 z-40 cursor-default border-0 bg-slate-900/30 p-0 ${flyoutLeft}`}
        onClick={onClose}
        aria-label="Закрыть библиотеку"
      />
      <div
        className={`absolute top-0 z-50 flex h-full min-w-0 flex-col border-l border-[#e5e5e5] bg-[#fafafa] shadow-[4px_0_32px_rgba(15,23,42,0.18)] ${flyoutLeft} ${flyoutWidth}`}
        role="dialog"
        aria-labelledby="gjs-block-lib-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#eeeeee] bg-white px-4 py-3">
          <h2 id="gjs-block-lib-title" className="text-[15px] font-bold text-[#222222]">
            {entry.flyoutTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-[#888] transition hover:bg-[#f0f0f0] hover:text-[#222]"
            aria-label="Закрыть"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4">
            <div className="grid grid-cols-1 gap-4">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => insertVariant(v)}
                  className="flex w-full flex-col rounded-lg border border-[#eeeeee] bg-[#fafafa] p-3 text-left transition hover:border-[#ddd] hover:shadow-sm"
                >
                  <VariantPreview variant={v} />
                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <span className="rounded-full bg-[#e8e8e8] px-2 py-0.5 text-[11px] font-bold text-[#555]">{v.badge}</span>
                    <span className="text-[14px] font-bold text-[#222222]">{v.title}</span>
                  </div>
                  {v.hint ? <p className="mt-1 text-[12px] text-[#888888]">{v.hint}</p> : null}
                  <p className="mt-2 text-[11px] text-[#aaa]">Нажмите, чтобы вставить на страницу</p>
                </button>
              ))}
            </div>
          </div>
      </div>
    </>
  );
}

function buildPreviewSrcDoc(variant: LemnityBoxLibraryVariant) {
  const body = variant.content.replace(/<\/script/gi, "<\\/script");
  const previewStyle = variant.previewCss ? `<style>${variant.previewCss}</style>` : "";
  /** Вертикально и горизонтально центрируем корневой блок — без этого превью «прилипает» к верху внутри кадра. */
  const previewFillHeight = `<style id="lemnity-preview-fill-height">html,body{margin:0;height:100%;overflow:hidden;}body{display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:center!important;min-height:100%!important;background:transparent!important;padding:clamp(8px,1.8vw,16px)!important;box-sizing:border-box!important;}body>:first-child{flex:0 1 auto!important;width:100%!important;max-height:100%!important;margin:0!important;box-sizing:border-box!important;}</style>`;
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>${previewFillHeight}${previewStyle}</head><body style="margin:0;overflow:hidden">${body}</body></html>`;
}

const IFRAME_PREVIEW_W = 720;
const IFRAME_PREVIEW_H = 900;

const PREVIEW_SHELL_HIGHLIGHT_SHADOW =
  "0px 0px 0px 0px rgba(255, 255, 255, 1), 0px 0px 0px 1px rgba(253, 186, 116, 0.6), 0px 0px 0px 0px rgba(0, 0, 0, 0)";

function ScaledIframeLibraryPreview({ srcDoc, highlight }: { srcDoc: string; highlight: boolean }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    function update() {
      const el = shellRef.current;
      if (!el) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw < 4 || ch < 4) return;
      setScale(Math.max(cw / IFRAME_PREVIEW_W, ch / IFRAME_PREVIEW_H));
    }

    update();
    const ro = new ResizeObserver(update);
    ro.observe(shell);
    return () => ro.disconnect();
  }, [srcDoc]);

  const s = scale ?? 149 / IFRAME_PREVIEW_H;

  return (
    <div
      ref={shellRef}
      style={highlight ? { boxShadow: PREVIEW_SHELL_HIGHLIGHT_SHADOW } : undefined}
      className="relative grid h-[149px] w-full shrink-0 place-content-center overflow-hidden rounded-md border border-[#c4c4c4] bg-slate-100 py-0 leading-[0]"
    >
      <iframe
        title=""
        className="pointer-events-none absolute left-1/2 top-1/2 border-0"
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
        style={{
          width: IFRAME_PREVIEW_W,
          height: IFRAME_PREVIEW_H,
          transform: `translate(-50%, -50%) scale(${s})`,
        }}
      />
    </div>
  );
}

function VariantPreview({ variant }: { variant: LemnityBoxLibraryVariant }) {
  const srcDoc = useMemo(() => buildPreviewSrcDoc(variant), [variant.content, variant.previewCss]);
  return <ScaledIframeLibraryPreview srcDoc={srcDoc} highlight={false} />;
}
