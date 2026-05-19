import { describe, expect, it } from "vitest";
import { applyProjectBrandKitToSlideGraph } from "./brand-kit-theme";
import type { SlideGraph } from "./types";
import type { ProjectBrandKitManifest } from "@/lib/project-brand-kit-library";

const baseGraph: SlideGraph = {
  version: 1,
  meta: {
    title: "Test",
    language: "ru",
    generatedAt: "",
    theme: {
      primaryColor: "#3b82f6",
      backgroundColor: "#ffffff",
      textColor: "#1a1a2e",
      fontFamily: "Inter, sans-serif",
    },
  },
  slides: [],
};

const manifest: ProjectBrandKitManifest = {
  version: 1,
  companyDescription: "Acme",
  slogan: "",
  brandValues: "",
  brandAesthetics: "",
  toneOfVoice: "",
  colors: [{ id: "c1", hex: "#c41e3a" }, { id: "c2", hex: "#1a1a2e" }, { id: "c3", hex: "#f8fafc" }],
  typography: {
    heading: { family: "Montserrat", sizePx: 40 },
    body: { family: "Roboto", sizePx: 16 },
  },
  logos: [],
  images: [],
  brandbook: null,
  updatedAt: new Date().toISOString(),
};

describe("applyProjectBrandKitToSlideGraph", () => {
  it("applies palette and fonts from project brand kit", () => {
    const next = applyProjectBrandKitToSlideGraph(baseGraph, manifest);
    expect(next.meta.theme.primaryColor).toBe("#c41e3a");
    expect(next.meta.theme.accentColor).toBe("#1a1a2e");
    expect(next.meta.theme.fontFamily).toBe("Roboto, sans-serif");
    expect(next.meta.theme.headingFont).toBe("Montserrat, sans-serif");
  });

  it("returns graph unchanged when manifest is null", () => {
    expect(applyProjectBrandKitToSlideGraph(baseGraph, null)).toBe(baseGraph);
  });
});
