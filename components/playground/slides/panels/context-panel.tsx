"use client";

import { Layers, Square, Palette, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import type { SlideElement } from "@/lib/slide-graph/types";

import { TextPropertiesPanel } from "./text-properties";
import { LabelPropertiesPanel } from "./label-properties";
import { ListPropertiesPanel } from "./list-properties";
import { ImagePropertiesPanel } from "./image-properties";
import { CardPropertiesPanel } from "./card-properties";
import { SlidePropertiesPanel } from "./slide-properties";
import { ThemeEditorPanel } from "./theme-editor";
import { NotesPanel } from "./notes-panel";
import { QualityScoreBadge } from "./quality-score-badge";

const TEXT_TYPES: SlideElement["type"][] = ["heading", "subheading", "body", "quote", "caption"];
const CARD_TYPES: SlideElement["type"][] = ["metric-card", "feature-card", "step-card", "stat-number", "pricing-card", "timeline-col"];

export function ContextPanel({ projectId }: { projectId: string }) {
  const rightMode = useEditorStore((s) => s.rightMode);
  const setRightMode = useEditorStore((s) => s.setRightMode);
  const selectedElemId = useEditorStore((s) => s.selectedElemId);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const graph = useSlideStore((s) => s.graph);
  const updateElement = useSlideStore((s) => s.updateElement);

  const slide = graph.slides[activeSlideIndex];
  const selectedEl = slide?.elements.find((e) => e.id === selectedElemId) ?? null;
  const selectedIndex = selectedEl ? (slide?.elements.indexOf(selectedEl) ?? 0) : 0;

  const onUpdate = (patch: Partial<SlideElement>) => {
    if (!slide || !selectedEl) return;
    updateElement(slide.id, selectedEl.id, patch);
  };

  const modes = [
    { key: "props" as const, icon: Layers, label: "Свойства" },
    { key: "slide" as const, icon: Square, label: "Слайд" },
    { key: "theme" as const, icon: Palette, label: "Тема" },
    { key: "notes" as const, icon: FileText, label: "Заметки" },
  ];

  return (
    <div className="w-56 shrink-0 border-l border-border bg-card flex flex-col">
      {/* Mode icon bar */}
      <div className="flex border-b border-border shrink-0">
        {modes.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => setRightMode(key)}
            className={cn(
              "flex-1 flex items-center justify-center py-2.5 transition-colors",
              rightMode === key ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {rightMode === "slide" && slide && (
          <SlidePropertiesPanel slide={slide} projectId={projectId} />
        )}
        {rightMode === "theme" && (
          <ThemeEditorPanel theme={graph.meta.theme} projectId={projectId} />
        )}
        {rightMode === "notes" && slide && (
          <NotesPanel slide={slide} projectId={projectId} />
        )}
        {rightMode === "props" && (
          <>
            {!selectedEl && slide && <SlidePropertiesPanel slide={slide} projectId={projectId} />}
            {selectedEl?.type === "label" && (
              <LabelPropertiesPanel
                element={selectedEl}
                elementIndex={selectedIndex}
                onUpdate={onUpdate}
              />
            )}
            {selectedEl && TEXT_TYPES.includes(selectedEl.type) && (
              <TextPropertiesPanel element={selectedEl} elementIndex={selectedIndex} onUpdate={onUpdate} />
            )}
            {selectedEl && selectedEl.type === "bullet-list" && (
              <ListPropertiesPanel element={selectedEl} elementIndex={selectedIndex} onUpdate={onUpdate} />
            )}
            {selectedEl && selectedEl.type === "image" && (
              <ImagePropertiesPanel
                element={selectedEl}
                elementIndex={selectedIndex}
                projectId={projectId}
                onUpdate={onUpdate}
              />
            )}
            {selectedEl && CARD_TYPES.includes(selectedEl.type) && (
              <CardPropertiesPanel element={selectedEl} elementIndex={selectedIndex} onUpdate={onUpdate} />
            )}
            {selectedEl && slide && (
              <QualityScoreBadge slide={slide} theme={graph.meta.theme} />
            )}
          </>
        )}
      </div>

    </div>
  );
}
