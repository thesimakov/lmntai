/**
 * GET  /api/analytics/[id]/share  — list share links for this project
 * POST /api/analytics/[id]/share  — create a new share link
 */
import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import {
  createAnalyticsShare,
  listAnalyticsShares,
  deleteAnalyticsShare,
  isAnalyticsRole,
} from "@/lib/analytics-share-db";

const createSchema = z.object({
  role: z.enum(["viewer", "investor", "analyst"]),
  label: z.string().max(80).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

async function guardProject(projectId: string, userId: string) {
  try {
    await requireProjectScopeForOwner(projectId, userId);
  } catch {
    return false;
  }
  return true;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;
  const { id: projectId } = await params;
  if (!(await guardProject(projectId, user.id))) return apiError("Not found", 403);

  const shares = await listAnalyticsShares(projectId, user.id);
  return apiOk({ shares });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;
  const { id: projectId } = await params;
  if (!(await guardProject(projectId, user.id))) return apiError("Not found", 403);

  const body = await parseBody(req, createSchema);
  if (!body.ok) return body.response;
  const { role, label, expiresInDays } = body.data;

  if (!isAnalyticsRole(role)) return apiError("Invalid role", 400);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86_400_000)
    : undefined;

  const share = await createAnalyticsShare(projectId, user.id, role, label, expiresAt);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemnity.com";
  const url = `${baseUrl}/share/analytics/${share.token}`;

  return apiOk({ share, url });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;
  const { id: projectId } = await params;
  if (!(await guardProject(projectId, user.id))) return apiError("Not found", 403);

  const { searchParams } = new URL(req.url);
  const shareId = searchParams.get("shareId");
  if (!shareId) return apiError("shareId required", 400);

  await deleteAnalyticsShare(shareId, user.id);
  return apiOk({ deleted: true });
}
