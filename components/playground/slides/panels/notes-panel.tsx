"use client";

import type { Slide } from "@/lib/slide-graph/types";

interface Props {
  slide: Slide;
  projectId: string;
}

export function NotesPanel(_: Props) {
  return <div>Notes</div>;
}
