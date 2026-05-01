import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import {
  bindPublishHost,
  listPublishHostsForSandbox,
  unbindPublishHost,
  verifyPublishHost
} from "@/lib/publish-domain-service";
import { setSandboxSharePublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

async function withOwner(
  req: NextRequest,
  { params }: RouteCtx,
  work: (arg: { sandboxId: string; user: { id: string; plan: string } }) => Promise<Response>
): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }
  const { id: routeId } = await params;
  const resolvedProject = await resolveProjectFromRequest(req);
  if (resolvedProject && routeId !== resolvedProject.id) {
    return new Response("Not found", { status: 404 });
  }
  const sandboxId = resolvedProject?.id ?? routeId;
  const allowed = await sandboxManager.canAccess(sandboxId, guard.data.user.id);
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }
  return work({ sandboxId, user: { id: guard.data.user.id, plan: guard.data.user.plan } });
}

async function getPublishDomains(req: NextRequest, ctx: RouteCtx) {
  return withOwner(req, ctx, async ({ sandboxId, user }) => {
    const rows = await listPublishHostsForSandbox(user.id, sandboxId);
    return Response.json({
      domains: rows.map((r) => ({
        id: r.id,
        host: r.host,
        verificationStatus: r.verificationStatus,
        verification: {
          status: r.verificationStatus,
          recordType: r.verificationStatus === "VERIFIED" ? null : "TXT",
          recordName: r.verificationStatus === "VERIFIED" ? null : `_lemnity-verify.${r.host}`,
          recordValue:
            r.verificationStatus === "VERIFIED" || !r.verificationToken
              ? null
              : `lemnity-verify=${r.verificationToken}`,
          verifiedAt: r.verifiedAt?.toISOString() ?? null
        },
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      }))
    });
  });
}

async function postPublishDomain(req: NextRequest, ctx: RouteCtx) {
  return withOwner(req, ctx, async ({ sandboxId, user }) => {
    const body = (await req.json().catch(() => null)) as { host?: string } | null;
    const hostRaw = body?.host?.trim() ?? "";
    if (!hostRaw) return new Response("host is required", { status: 400 });

    const bound = await bindPublishHost({
      ownerId: user.id,
      ownerPlan: user.plan,
      sandboxId,
      hostRaw
    });
    if (!bound.ok) {
      const codeToStatus: Record<string, number> = {
        invalid_host: 400,
        forbidden_plan: 403,
        reserved_host: 400,
        forbidden_owner: 409
      };
      return Response.json({ error: bound.code }, { status: codeToStatus[bound.code] ?? 400 });
    }

    await setSandboxSharePublic(sandboxId, user.id, true);
    return Response.json(
      {
        host: bound.host,
        sandboxId: bound.sandboxId,
        isPublic: true,
        verification: bound.verification
      },
      { status: 201 }
    );
  });
}

async function deletePublishDomain(req: NextRequest, ctx: RouteCtx) {
  return withOwner(req, ctx, async ({ user }) => {
    const body = (await req.json().catch(() => null)) as { host?: string } | null;
    const hostRaw = body?.host?.trim() ?? "";
    if (!hostRaw) return new Response("host is required", { status: 400 });
    const unbound = await unbindPublishHost({ ownerId: user.id, hostRaw });
    if (!unbound.ok) {
      return Response.json({ error: unbound.code }, { status: unbound.code === "invalid_host" ? 400 : 409 });
    }
    return new Response(null, { status: 204 });
  });
}

async function putPublishDomain(req: NextRequest, ctx: RouteCtx) {
  return withOwner(req, ctx, async ({ user }) => {
    const body = (await req.json().catch(() => null)) as { host?: string } | null;
    const hostRaw = body?.host?.trim() ?? "";
    if (!hostRaw) return new Response("host is required", { status: 400 });
    const verified = await verifyPublishHost({ ownerId: user.id, hostRaw });
    if (!verified.ok) {
      const codeToStatus: Record<string, number> = {
        invalid_host: 400,
        not_found: 404,
        forbidden_owner: 409,
        invalid_state: 400
      };
      return Response.json({ error: verified.code }, { status: codeToStatus[verified.code] ?? 400 });
    }
    return Response.json({
      verified: verified.verified,
      verification: verified.verification
    });
  });
}

export const GET = withApiLogging("/api/sandbox/[id]/publish-domain", getPublishDomains);
export const POST = withApiLogging("/api/sandbox/[id]/publish-domain", postPublishDomain);
export const DELETE = withApiLogging("/api/sandbox/[id]/publish-domain", deletePublishDomain);
export const PUT = withApiLogging("/api/sandbox/[id]/publish-domain", putPublishDomain);
