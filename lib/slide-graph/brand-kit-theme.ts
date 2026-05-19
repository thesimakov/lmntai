import type { ProjectBrandKitManifest } from "@/lib/project-brand-kit-library";
import type { SlideGraph, SlideTheme } from "./types";

function hexLuminance(hex: string): number {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function fontStack(family: string): string {
  const t = family.trim();
  if (!t) return "Inter, sans-serif";
  return t.includes(",") ? t : `${t}, sans-serif`;
}

/** Merge project brand kit colors/typography into slide graph theme (post-AI). */
export function applyProjectBrandKitToSlideGraph(
  graph: SlideGraph,
  manifest: ProjectBrandKitManifest | null | undefined
): SlideGraph {
  if (!manifest) return graph;

  const palette = manifest.colors.map((c) => c.hex).filter((h) => /^#[0-9A-Fa-f]{6}$/.test(h));
  const theme: SlideTheme = { ...graph.meta.theme };

  if (palette.length > 0) {
    const sorted = [...palette].sort((a, b) => hexLuminance(a) - hexLuminance(b));
    const darkest = sorted[0]!;
    const lightest = sorted[sorted.length - 1]!;

    theme.primaryColor = palette[0]!;
    if (palette[1]) theme.accentColor = palette[1];
    if (palette[2]) theme.secondaryColor = palette[2];
    theme.textColor = hexLuminance(darkest) < 0.45 ? darkest : theme.textColor;
    if (hexLuminance(lightest) > 0.85) {
      theme.backgroundColor = lightest;
    }
  }

  const bodyFont = manifest.typography.body.family?.trim();
  const headingFont = manifest.typography.heading.family?.trim();
  if (bodyFont) theme.fontFamily = fontStack(bodyFont);
  if (headingFont) theme.headingFont = fontStack(headingFont);

  return {
    ...graph,
    meta: { ...graph.meta, theme },
  };
}
