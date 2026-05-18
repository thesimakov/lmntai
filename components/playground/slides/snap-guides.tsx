"use client";

import type { SnapGuide } from "@/lib/stores/use-editor-store";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H } from "@/lib/slide-graph/freeform";

export function SnapGuides({ guides }: { guides: SnapGuide[] }) {
  if (guides.length === 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 999, width: SLIDE_CANVAS_W, height: SLIDE_CANVAS_H }}>
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <div key={i} style={{ position: "absolute", left: g.value, top: 0, width: 1, height: SLIDE_CANVAS_H, background: "rgba(59,130,246,0.7)" }} />
        ) : (
          <div key={i} style={{ position: "absolute", top: g.value, left: 0, height: 1, width: SLIDE_CANVAS_W, background: "rgba(59,130,246,0.7)" }} />
        )
      )}
    </div>
  );
}
