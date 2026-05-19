import { z } from "zod";

import {
  brandColorEntrySchema,
  brandMediaAssetSchema,
  brandTypographySlotSchema,
} from "@/lib/brand-kit-library";

export const projectBrandKitManifestSchema = z.object({
  version: z.literal(1),
  companyDescription: z.string(),
  slogan: z.string(),
  brandValues: z.string(),
  brandAesthetics: z.string(),
  toneOfVoice: z.string(),
  colors: z.array(brandColorEntrySchema),
  typography: z.object({
    heading: brandTypographySlotSchema,
    body: brandTypographySlotSchema,
  }),
  logos: z.array(brandMediaAssetSchema),
  images: z.array(brandMediaAssetSchema),
  brandbook: brandMediaAssetSchema.nullable(),
  updatedAt: z.string(),
});

export type ProjectBrandKitManifest = z.infer<typeof projectBrandKitManifestSchema>;

export type ProjectBrandKitState = {
  companyDescription: string;
  slogan: string;
  brandValues: string;
  brandAesthetics: string;
  toneOfVoice: string;
  colors: Array<{ id: string; hex: string }>;
  typography: {
    heading: { family: string; sizePx: number };
    body: { family: string; sizePx: number };
  };
  logos: Array<{ id: string; name: string; fileName?: string; url?: string }>;
  images: Array<{ id: string; name: string; fileName?: string; url?: string }>;
  brandbook: { id: string; name: string; fileName?: string; url?: string } | null;
};

export type ProjectBrandKitLibraryDto = {
  manifest: ProjectBrandKitManifest;
  assetUrls: Record<string, string>;
};

export function emptyProjectBrandKitState(): ProjectBrandKitState {
  return {
    companyDescription: "",
    slogan: "",
    brandValues: "",
    brandAesthetics: "",
    toneOfVoice: "",
    colors: [],
    typography: {
      heading: { family: "Inter", sizePx: 32 },
      body: { family: "Inter", sizePx: 16 },
    },
    logos: [],
    images: [],
    brandbook: null,
  };
}

export function projectBrandKitStateToManifest(
  state: ProjectBrandKitState
): Omit<ProjectBrandKitManifest, "version" | "updatedAt"> {
  const toAsset = (a: ProjectBrandKitState["logos"][number]) => ({
    id: a.id,
    name: a.name,
    ...(a.fileName ? { fileName: a.fileName } : {}),
  });

  return {
    companyDescription: state.companyDescription,
    slogan: state.slogan,
    brandValues: state.brandValues,
    brandAesthetics: state.brandAesthetics,
    toneOfVoice: state.toneOfVoice,
    colors: state.colors,
    typography: state.typography,
    logos: state.logos.map(toAsset),
    images: state.images.map(toAsset),
    brandbook: state.brandbook
      ? toAsset(state.brandbook)
      : null,
  };
}

export function manifestToProjectBrandKitState(
  manifest: ProjectBrandKitManifest,
  assetUrls: Record<string, string>
): ProjectBrandKitState {
  const withUrl = (assets: ProjectBrandKitManifest["logos"]) =>
    assets.map((a) => ({ id: a.id, name: a.name, fileName: a.fileName, url: assetUrls[a.id] }));

  return {
    companyDescription: manifest.companyDescription,
    slogan: manifest.slogan,
    brandValues: manifest.brandValues,
    brandAesthetics: manifest.brandAesthetics,
    toneOfVoice: manifest.toneOfVoice,
    colors: manifest.colors,
    typography: manifest.typography,
    logos: withUrl(manifest.logos),
    images: withUrl(manifest.images),
    brandbook: manifest.brandbook
      ? { ...manifest.brandbook, url: assetUrls[manifest.brandbook.id] }
      : null,
  };
}

export function formatProjectBrandKitForAiPrompt(manifest: ProjectBrandKitManifest): string {
  const lines: string[] = [
    "---",
    "Project brand kit (apply to all visual and copy outputs):",
  ];

  if (manifest.companyDescription.trim()) {
    lines.push(`Company: ${manifest.companyDescription.trim()}`);
  }
  if (manifest.slogan.trim()) {
    lines.push(`Slogan: ${manifest.slogan.trim()}`);
  }
  if (manifest.brandValues.trim()) {
    lines.push(`Brand values: ${manifest.brandValues.trim()}`);
  }
  if (manifest.brandAesthetics.trim()) {
    lines.push(`Brand aesthetics: ${manifest.brandAesthetics.trim()}`);
  }
  if (manifest.toneOfVoice.trim()) {
    lines.push(`Tone of voice: ${manifest.toneOfVoice.trim()}`);
  }
  if (manifest.colors.length > 0) {
    lines.push(`Palette: ${manifest.colors.map((c) => c.hex).join(", ")}`);
  }
  lines.push(
    `Typography — heading: ${manifest.typography.heading.family} ${manifest.typography.heading.sizePx}px; body: ${manifest.typography.body.family} ${manifest.typography.body.sizePx}px`
  );
  if (manifest.logos.length > 0) {
    lines.push(`Logo assets: ${manifest.logos.map((l) => l.name).join(", ")}`);
  }
  if (manifest.images.length > 0) {
    lines.push(`Brand images: ${manifest.images.map((i) => i.name).join(", ")}`);
  }
  if (manifest.brandbook) {
    lines.push(`Brandbook: ${manifest.brandbook.name}`);
  }

  lines.push("Respect these brand constraints in layout, colors, typography, and tone.");
  return lines.join("\n");
}

export function appendProjectBrandKitToSystemPrompt(
  system: string,
  brandKitBlock?: string | null
): string {
  if (!brandKitBlock?.trim()) return system;
  return `${system}\n\n${brandKitBlock.trim()}`;
}
