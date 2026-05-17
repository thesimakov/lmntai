import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { brandKitManifestSchema } from "@/lib/brand-kit-library";
import {
  deleteBrandKitLibrary,
  getBrandKitLibrary,
  libraryDtoToProjectState,
  parseBrandKitAssetUpload,
  saveBrandKitLibrary,
} from "@/lib/brand-kit-service";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

const brandKitPutBodySchema = z.object({
  companyDescription: z.string(),
  slogan: z.string(),
  brandValues: z.string(),
  brandAesthetics: z.string(),
  colors: z.array(z.object({ id: z.string(), hex: z.string() })),
  typography: z.object({
    heading: z.object({ family: z.string(), sizePx: z.number() }),
    body: z.object({ family: z.string(), sizePx: z.number() }),
  }),
  logos: z.array(z.object({ id: z.string(), name: z.string(), fileName: z.string().optional() })),
  images: z.array(z.object({ id: z.string(), name: z.string(), fileName: z.string().optional() })),
});

async function getBrandKit(): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const library = await getBrandKitLibrary(guard.data.user.id);
  return apiOk({ library, state: library ? libraryDtoToProjectState(library) : null });
}

async function putBrandKit(req: NextRequest): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Bad request", 400);
  }

  const rawData = formData.get("data");
  if (typeof rawData !== "string") {
    return apiError("Missing data", 400);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawData);
  } catch {
    return apiError("Invalid JSON in data", 400);
  }

  const bodyResult = brandKitPutBodySchema.safeParse(parsedJson);
  if (!bodyResult.success) {
    return apiError("Invalid brand kit payload", 400);
  }

  const body = bodyResult.data;
  const uploads = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("asset_")) continue;
    if (typeof value === "string") continue;
    const file = value as File;
    if (file.size === 0) continue;
    const assetId = key.slice("asset_".length);
    const upload = await parseBrandKitAssetUpload(file, assetId);
    if (!upload) {
      const label = file.name?.trim() || assetId;
      return apiError(
        `Unsupported file "${label}". Use PNG, JPEG, WebP, or SVG up to 6 MB.`,
        415,
        { code: "UNSUPPORTED_MEDIA" }
      );
    }
    uploads.push(upload);
  }

  const state = {
    companyDescription: body.companyDescription,
    slogan: body.slogan,
    brandValues: body.brandValues,
    brandAesthetics: body.brandAesthetics,
    colors: body.colors,
    typography: body.typography,
    logos: body.logos.map((l) => ({
      id: l.id,
      name: l.name,
      fileName: l.fileName,
    })),
    images: body.images.map((i) => ({
      id: i.id,
      name: i.name,
      fileName: i.fileName,
    })),
  };

  const library = await saveBrandKitLibrary(guard.data.user.id, state, uploads);
  const validated = brandKitManifestSchema.safeParse(library.manifest);
  if (!validated.success) {
    return apiError("Saved manifest validation failed", 500);
  }

  return apiOk({
    library,
    state: libraryDtoToProjectState(library),
  });
}

async function deleteBrandKitHandler(): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  await deleteBrandKitLibrary(guard.data.user.id);
  return apiOk({ deleted: true });
}

export const GET = withApiLogging("/api/brand-kit", getBrandKit);
export const PUT = withApiLogging("/api/brand-kit", putBrandKit);
export const DELETE = withApiLogging("/api/brand-kit", deleteBrandKitHandler);
