import { z } from "zod";
import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import {
  bindLemnityAiPreviewHtmlToHostProject,
  bindLemnityAiPreviewToHostProject,
} from "@/lib/lemnity-ai-bind-host-preview";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z
  .object({
    sourceSandboxId: z.string().min(1).max(500).optional(),
    html: z.string().min(1).max(12_000_000).optional(),
  })
  .refine((v) => Boolean(v.sourceSandboxId?.trim() || v.html?.trim()), {
    message: "sourceSandboxId or html required",
  });

async function postBindPreview(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: guard.data.user.id },
    select: { id: true },
  });
  if (!project) return apiError("Not found", 404);

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return apiError("Invalid request body", 400);

  const html = parsed.data.html?.trim();
  const source = parsed.data.sourceSandboxId?.trim();
  const bound = html
    ? await bindLemnityAiPreviewHtmlToHostProject(projectId, guard.data.user.id, html)
    : source
      ? await bindLemnityAiPreviewToHostProject(projectId, guard.data.user.id, source)
      : false;
  if (!bound) {
    return apiError("Preview HTML not available", 404);
  }
  return apiOk({ bound: true });
}

export const POST = withApiLogging("/api/projects/[id]/bind-preview", postBindPreview);
