"use client";

import { useZbEditorStore } from "@/lib/zero-block-editor/store";

export function ZbSnapGuides() {
  const { snapGuides, canvas } = useZbEditorStore();
  if (snapGuides.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 9999 }}
    >
      {snapGuides.map((guide, i) =>
        guide.orientation === "v" ? (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: guide.position,
              width: 1,
              background: "#f26b4f",
              opacity: 0.8,
            }}
          />
        ) : (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: guide.position,
              height: 1,
              background: "#f26b4f",
              opacity: 0.8,
            }}
          />
        ),
      )}
    </div>
  );
}
