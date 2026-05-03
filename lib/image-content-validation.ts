const JPEG_PREFIX = [0xff, 0xd8, 0xff];
const PNG_PREFIX = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF87A_PREFIX = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89A_PREFIX = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const WEBP_RIFF_PREFIX = [0x52, 0x49, 0x46, 0x46];
const WEBP_WEBP_PREFIX = [0x57, 0x45, 0x42, 0x50];

export type UploadImageMime = "image/png" | "image/jpeg" | "image/webp";
export type RasterImageMime = UploadImageMime | "image/gif";

const MIME_ALIASES: Record<string, UploadImageMime> = {
  "image/jpg": "image/jpeg",
  "image/jpeg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/png": "image/png",
  "image/x-png": "image/png",
  "image/webp": "image/webp"
};

function hasPrefix(buf: Uint8Array, prefix: number[], offset = 0): boolean {
  if (buf.length < offset + prefix.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (buf[offset + i] !== prefix[i]) return false;
  }
  return true;
}

export function normalizeUploadImageMime(value: string | null | undefined): UploadImageMime | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return MIME_ALIASES[normalized] ?? null;
}

export function detectRasterImageMime(buf: Uint8Array): RasterImageMime | null {
  if (hasPrefix(buf, PNG_PREFIX)) return "image/png";
  if (hasPrefix(buf, JPEG_PREFIX)) return "image/jpeg";
  if (hasPrefix(buf, GIF87A_PREFIX) || hasPrefix(buf, GIF89A_PREFIX)) return "image/gif";
  if (hasPrefix(buf, WEBP_RIFF_PREFIX) && hasPrefix(buf, WEBP_WEBP_PREFIX, 8)) return "image/webp";
  return null;
}

export function detectUploadImageMime(buf: Uint8Array): UploadImageMime | null {
  const detected = detectRasterImageMime(buf);
  if (detected === "image/gif") return null;
  return detected;
}

export function uploadImageExtensionFromMime(mime: UploadImageMime): "png" | "jpg" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function isSvgMime(mime: string | null | undefined): boolean {
  return (mime ?? "").trim().toLowerCase() === "image/svg+xml";
}
