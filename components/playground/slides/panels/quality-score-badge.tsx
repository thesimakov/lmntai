"use client";

import type { Slide, SlideTheme } from "@/lib/slide-graph/types";

interface Props {
  slide: Slide;
  theme: SlideTheme;
}

export function QualityScoreBadge(_: Props) {
  return <div>Quality</div>;
}
