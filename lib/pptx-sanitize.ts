export type PptxBrandAssets = {
  primaryHex?: string;
  accentHex?: string;
  logoData?: { base64: string; mime: string };
};

/** PptxGenJS принимает только 6-значный RGB без #. */
export function sanitizePptxHex(hex: string | undefined, fallback: string): string {
  const fb = fallback.replace(/^#/, "").toUpperCase();
  if (!hex?.trim()) return fb;
  let t = hex.trim().replace(/^#/, "");
  if (/^[0-9A-Fa-f]{3}$/.test(t)) {
    t = `${t[0]}${t[0]}${t[1]}${t[1]}${t[2]}${t[2]}`;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return t.toUpperCase();
  return fb;
}

const PPTX_EMBEDDABLE_LOGO_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function sanitizePptxBrandAssets(
  brand: PptxBrandAssets | undefined
): PptxBrandAssets | undefined {
  if (!brand) return undefined;
  const primaryHex = brand.primaryHex
    ? sanitizePptxHex(brand.primaryHex, "0F1C35")
    : undefined;
  const accentHex = brand.accentHex ? sanitizePptxHex(brand.accentHex, "1D4ED8") : undefined;
  const logoData =
    brand.logoData && PPTX_EMBEDDABLE_LOGO_MIMES.has(brand.logoData.mime.toLowerCase())
      ? brand.logoData
      : undefined;
  if (!primaryHex && !accentHex && !logoData) return undefined;
  return { primaryHex, accentHex, logoData };
}
