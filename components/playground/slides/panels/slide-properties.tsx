"use client";

import { ImageUploader } from "@/components/editor/ImageUploader";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import type { Slide } from "@/lib/slide-graph/types";

interface Props { slide: Slide; projectId: string }

export function SlidePropertiesPanel({ slide, projectId }: Props) {
  const updateBackground = useSlideStore((s) => s.updateBackground);

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Фон слайда</p>

      <div className="space-y-1.5">
        <span className="text-[9px] text-muted-foreground uppercase">Цвет</span>
        <input
          type="color"
          className="w-full h-8 rounded border border-border cursor-pointer"
          value={slide.background?.color ?? "#ffffff"}
          onChange={(e) => updateBackground(slide.id, { ...slide.background, color: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-[9px] text-muted-foreground uppercase">Изображение (URL)</span>
        <input
          className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="https://..."
          value={slide.background?.image ?? ""}
          onChange={(e) => updateBackground(slide.id, { ...slide.background, image: e.target.value || undefined })}
        />
        <ImageUploader
          sandboxId={projectId}
          labels={{
            upload: "Загрузить файл",
            uploading: "Загрузка…",
            errorType: "Поддерживаются PNG, JPEG, WebP, SVG",
          }}
          onUploaded={(url) =>
            updateBackground(slide.id, { ...slide.background, image: url })
          }
        />
      </div>

      {slide.background?.image && (
        <div className="space-y-1.5">
          <span className="text-[9px] text-muted-foreground uppercase">Затемнение</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            className="w-full"
            value={slide.background?.overlay ?? 0}
            onChange={(e) => updateBackground(slide.id, { ...slide.background, overlay: Number(e.target.value) })}
          />
        </div>
      )}
    </div>
  );
}
