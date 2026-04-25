"use client";

import { useCallback, useState } from "react";

import type { StreamEvent, StreamStep } from "@/types/build-stream";

/** Пункты выше текущего (running / completed) не остаются «пустыми», если бэкенд не прислал completed на каждый шаг. */
function promoteStepsBeforeActive(steps: StreamStep[], activeIndex: number): StreamStep[] {
  if (activeIndex <= 0) return steps;
  const next = [...steps];
  for (let j = 0; j < activeIndex; j++) {
    if (next[j].status === "failed") continue;
    if (next[j].status === "pending" || next[j].status === "running") {
      next[j] = { ...next[j], status: "completed" };
    }
  }
  return next;
}

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
        let next: StreamStep[];
        if (i === -1) {
          next = [...prev, row];
        } else {
          next = [...prev];
          next[i] = row;
        }
        const idx = next.findIndex((s) => s.id === e.id);
        if (idx >= 0 && (e.status === "running" || e.status === "completed")) {
          next = promoteStepsBeforeActive(next, idx);
        }
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
