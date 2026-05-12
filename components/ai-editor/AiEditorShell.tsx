"use client";

import type { ReactNode } from "react";
import { AiEditorPreview } from "./AiEditorPreview";

type Props = {
  chatSlot?: ReactNode;
  previewSlot: ReactNode;
};

export function AiEditorShell({ chatSlot, previewSlot }: Props) {
  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-row items-stretch overflow-hidden">
      {chatSlot}
      <AiEditorPreview>{previewSlot}</AiEditorPreview>
    </div>
  );
}
