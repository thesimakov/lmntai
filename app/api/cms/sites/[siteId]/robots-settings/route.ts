import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError } from "@/lib/api-response";
import {
  buildAutoRobotsTxtForSite,
  normalizeStoredRobotsOverride,
  resolveProjectPublicOrigin,
} from "@/lib/cms-robots-site";
import { requireCmsSiteAccess } from "@/lib/cms-core";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getRobotsSettings(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  const row = await prisma.cmsSite.findUnique({
    where: { id: siteId },
    select: {
      robotsTxtOverride: true,
      projectId: true,
    },
  });
  if (!row) return apiError("Not found", 404);

  const generatedRaw = await buildAutoRobotsTxtForSite(siteId);
  const generated = `${generatedRaw.replace(/\r\n/g, "\n").trimEnd()}\n`;

  const overrideCanon = normalizeStoredRobotsOverride(row.robotsTxtOverride ?? undefined);

  const publicOrigin = await resolveProjectPublicOrigin(row.projectId);

  return Response.json({
    override: overrideCanon,
    generated,
    publicOrigin,
  });
}

async function patchRobotsSettings(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { siteId } = await params;
  const access = await requireCmsSiteAccess(siteId, guard.data.user.id);
  if (!access) return apiError("Not found", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_json", 400);
  }
  const b = body as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(b, "robotsTxtOverride")) {
    return apiError("missing_robotsTxtOverride", 400);
  }
  const raw = b.robotsTxtOverride;
  let next: string | null;
  if (raw === undefined || raw === null) next = null;
  else if (typeof raw === "string") {
    next = normalizeStoredRobotsOverride(raw);
    if (raw.trim() && next === null) {
      return apiError("robots_override_too_long", 400);
    }
  } else {
    return apiError("bad_robots_override", 400);
  }

  await prisma.cmsSite.update({
    where: { id: siteId },
    data: { robotsTxtOverride: next },
  });

  const generated = (await buildAutoRobotsTxtForSite(siteId)).replace(/\r\n/g, "\n").trimEnd() + "\n";
  return Response.json({ ok: true, override: next, generated });
}

export const GET = withApiLogging("/api/cms/sites/[siteId]/robots-settings", getRobotsSettings);
export const PATCH = withApiLogging("/api/cms/sites/[siteId]/robots-settings", patchRobotsSettings);
