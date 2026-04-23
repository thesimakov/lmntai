"use client";

import { useCallback, useState } from "react";

import type { StreamEvent, StreamStep } from "@/types/build-stream";

export function useBuildStreamLog() {
  const [steps, setSteps] = useState<StreamStep[]>([]);
  const [toolLine, setToolLine] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSteps([]);
    setToolLine(null);
  }, []);

  const applyEvent = useCallback((e: StreamEvent) => {
    if (e.type === "step") {
      setSteps((prev) => {
        const i = prev.findIndex((s) => s.id === e.id);
        const row: StreamStep = { id: e.id, description: e.description, status: e.status };
        if (i === -1) return [...prev, row];
        const next = [...prev];
        next[i] = row;
        return next;
      });
      return;
    }
    if (e.type === "tool") {
      const detail = e.detail ? ` ${e.detail}` : "";
      const prefix = e.status === "calling" ? "→" : "✓";
      setToolLine(`${prefix} ${e.name}${detail}`);
    }
  }, []);

  return { steps, toolLine, reset, applyEvent };
}
