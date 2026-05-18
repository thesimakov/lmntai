"use client";

import type { SlideElement } from "@/lib/slide-graph/types";

interface Props {
  element: SlideElement;
  elementIndex: number;
  onUpdate: (p: Partial<SlideElement>) => void;
}

export function CardPropertiesPanel(_: Props) {
  return <div>Card Properties</div>;
}
