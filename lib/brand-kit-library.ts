import { z } from "zod";

import type { ProjectBrandKitState } from "@/components/dashboard/project-brand-kit-fields";

export const brandTypographySlotSchema = z.object({
  family: z.string().min(1),
  sizePx: z.number().int().min(12).max(130),
});

export const brandColorEntrySchema = z.object({
  id: z.string().min(1),
  hex: z.string().min(1),
});

export const brandMediaAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  fileName: z.string().min(1).optional(),
});

export const brandKitManifestSchema = z.object({
  version: z.literal(1),
  companyDescription: z.string(),
  slogan: z.string(),
  brandValues: z.string(),
  brandAesthetics: z.string(),
  colors: z.array(brandColorEntrySchema),
  typography: z.object({
    heading: brandTypographySlotSchema,
    body: brandTypographySlotSchema,
  }),
  logos: z.array(brandMediaAssetSchema),
  images: z.array(brandMediaAssetSchema),
  updatedAt: z.string(),
});

export type BrandKitManifest = z.infer<typeof brandKitManifestSchema>;

export type BrandKitLibraryDto = {
  manifest: BrandKitManifest;
  assetUrls: Record<string, string>;
};

export function projectStateToManifest(state: ProjectBrandKitState): Omit<BrandKitManifest, "version" | "updatedAt"> {
  return {
    companyDescription: state.companyDescription,
    slogan: state.slogan,
    brandValues: state.brandValues,
    brandAesthetics: state.brandAesthetics,
    colors: state.colors,
    typography: state.typography,
    logos: state.logos.map(({ id, name, fileName }) => ({
      id,
      name,
      ...(fileName ? { fileName } : {}),
    })),
    images: state.images.map(({ id, name, fileName }) => ({
      id,
      name,
      ...(fileName ? { fileName } : {}),
    })),
  };
}

export function manifestToProjectState(
  manifest: BrandKitManifest,
  assetUrls: Record<string, string>
): ProjectBrandKitState {
  const withUrls = (assets: BrandKitManifest["logos"]) =>
    assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      fileName: asset.fileName,
      url: assetUrls[asset.id],
    }));

  return {
    companyDescription: manifest.companyDescription,
    slogan: manifest.slogan,
    brandValues: manifest.brandValues,
    brandAesthetics: manifest.brandAesthetics,
    colors: manifest.colors,
    typography: manifest.typography,
    logos: withUrls(manifest.logos),
    images: withUrls(manifest.images),
  };
}

export function formatBrandKitForAiPrompt(manifest: BrandKitManifest): string {
  const lines: string[] = [
    "---",
    "Brand kit library (apply to all visual and copy outputs):",
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

  lines.push("Respect these brand constraints in layout, colors, typography, and tone.");
  return lines.join("\n");
}

export function appendBrandKitToSystemPrompt(system: string, brandKitBlock: string | null): string {
  if (!brandKitBlock?.trim()) return system;
  return `${system}\n\n${brandKitBlock.trim()}`;
}
