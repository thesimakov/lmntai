"use client";

import type { ReactNode } from "react";
import { AiEditorSidebar } from "./AiEditorSidebar";
import { AiEditorPreview } from "./AiEditorPreview";

type Props = {
  projectName: string;
  projectId: string;
  isGenerating: boolean;
  modelLabel?: string;
  onSubmitPrompt: (prompt: string) => void;
  onVersionRestoreHtml: (html: string, css: string) => void;
  chatSlot?: ReactNode;
  previewSlot: ReactNode;
};

export function AiEditorShell({
  projectName,
  projectId,
  isGenerating,
  modelLabel,
  onSubmitPrompt,
  onVersionRestoreHtml,
  chatSlot,
  previewSlot,
}: Props) {
  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-row items-stretch overflow-hidden">
      <AiEditorSidebar
        projectName={projectName}
        projectId={projectId}
        isGenerating={isGenerating}
        modelLabel={modelLabel}
        onSubmitPrompt={onSubmitPrompt}
        onVersionRestoreHtml={onVersionRestoreHtml}
        chatSlot={chatSlot}
      />
      <AiEditorPreview>{previewSlot}</AiEditorPreview>
    </div>
  );
}
