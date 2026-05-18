"use client";

import { useMemo } from "react";
import { scoreSlide } from "@/lib/slide-graph/quality-scorer";
import type { Slide, SlideTheme } from "@/lib/slide-graph/types";

interface Props { slide: Slide; theme: SlideTheme }

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px]">
        <span className="text-muted-foreground">{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export function QualityScoreBadge({ slide, theme }: Props) {
  const score = useMemo(() => scoreSlide(slide, theme), [slide, theme]);
  const color = score.total >= 70 ? "#22c55e" : score.total >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Качество</p>
        <span className="text-lg font-bold" style={{ color }}>{score.total}</span>
      </div>
      <div className="space-y-1.5">
        <ScoreBar label="Иерархия" value={score.hierarchy} color="#60a5fa" />
        <ScoreBar label="Плотность" value={score.density} color="#34d399" />
        <ScoreBar label="Баланс" value={score.balance} color="#a78bfa" />
        <ScoreBar label="Читаемость" value={score.readability} color="#f59e0b" />
      </div>
    </div>
  );
}
