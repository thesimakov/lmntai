"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AiEditorPreview({ children }: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
