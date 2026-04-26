import type { NextRequest } from "next/server";

import { resolveSandboxByHost } from "@/lib/publish-domain-service";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { withApiLogging } from "@/lib/with-api-logging";

async function getResolvePublishHost(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host") ?? req.headers.get("x-publish-host") ?? "";
  if (!host) {
    return Response.json({ sandboxId: null }, { status: 400 });
  }
  const sandboxId = await resolveSandboxByHost(host);
  if (!sandboxId) {
    return Response.json({ sandboxId: null }, { headers: { "Cache-Control": "no-store" } });
  }
  const isPublic = await isSandboxLinkPublic(sandboxId);
  if (!isPublic) {
    return Response.json({ sandboxId: null }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ sandboxId }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiLogging("/api/publish/resolve", getResolvePublishHost);
