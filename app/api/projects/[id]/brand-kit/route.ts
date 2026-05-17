import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { withApiLogging } from "@/lib/with-api-logging";
import { prisma } from "@/lib/prisma";
import { projectBrandKitManifestSchema } from "@/lib/project-brand-kit-library";
import {
  deleteProjectBrandKit,
  getProjectBrandKit,
  libraryDtoToProjectBrandKitState,
  parseProjectBrandKitAssetUpload,
  saveProjectBrandKit,
} from "@/lib/project-brand-kit-service";

export const runtime = "nodejs";

const brandKitPutBodySchema = z.object({
  companyDescription: z.string(),
  slogan: z.string(),
  brandValues: z.string(),
  brandAesthetics: z.string(),
  toneOfVoice: z.string(),
  colors: z.array(z.object({ id: z.string(), hex: z.string() })),
  typography: z.object({
    heading: z.object({ family: z.string(), sizePx: z.number() }),
    body: z.object({ family: z.string(), sizePx: z.number() }),
  }),
  logos: z.array(z.object({ id: z.string(), name: z.string(), fileName: z.string().optional() })),
  images: z.array(z.object({ id: z.string(), name: z.string(), fileName: z.string().optional() })),
  brandbook: z.object({ id: z.string(), name: z.string(), fileName: z.string().optional() }).nullable(),
});

async function requireProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  });
}

async function getHandler(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  const library = await getProjectBrandKit(projectId);
  return apiOk({ library, state: library ? libraryDtoToProjectBrandKitState(library) : null });
}

async function putHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Bad request", 400);
  }

  const rawData = formData.get("data");
  if (typeof rawData !== "string") return apiError("Missing data", 400);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawData);
  } catch {
    return apiError("Invalid JSON in data", 400);
  }

  const bodyResult = brandKitPutBodySchema.safeParse(parsedJson);
  if (!bodyResult.success) return apiError("Invalid brand kit payload", 400);

  const body = bodyResult.data;
  const uploads = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("asset_") || !(value instanceof File)) continue;
    const assetId = key.slice("asset_".length);
    const upload = await parseProjectBrandKitAssetUpload(value, assetId);
    if (!upload) return apiError("Unsupported or invalid asset upload", 415);
    uploads.push(upload);
  }

  const state = {
    companyDescription: body.companyDescription,
    slogan: body.slogan,
    brandValues: body.brandValues,
    brandAesthetics: body.brandAesthetics,
    toneOfVoice: body.toneOfVoice,
    colors: body.colors,
    typography: body.typography,
    logos: body.logos.map((l) => ({ id: l.id, name: l.name, fileName: l.fileName })),
    images: body.images.map((i) => ({ id: i.id, name: i.name, fileName: i.fileName })),
    brandbook: body.brandbook
      ? { id: body.brandbook.id, name: body.brandbook.name, fileName: body.brandbook.fileName }
      : null,
  };

  const library = await saveProjectBrandKit(projectId, state, uploads);
  const validated = projectBrandKitManifestSchema.safeParse(library.manifest);
  if (!validated.success) return apiError("Saved manifest validation failed", 500);

  return apiOk({ library, state: libraryDtoToProjectBrandKitState(library) });
}

async function deleteHandler(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  await deleteProjectBrandKit(projectId);
  return apiOk({ deleted: true });
}

export const GET = withApiLogging("/api/projects/[id]/brand-kit", getHandler);
export const PUT = withApiLogging("/api/projects/[id]/brand-kit", putHandler);
export const DELETE = withApiLogging("/api/projects/[id]/brand-kit", deleteHandler);
