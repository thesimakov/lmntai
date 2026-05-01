import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { resolveProjectFromRequest } from "@/lib/project-domain-resolution";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

const MAX_PUCK_JSON_CHARS = 2_000_000;

async function getPuck(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response("Unauthorized", { status: 401 });
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
  const files = await sandboxManager.exportFiles(sandboxId);
  const raw = files["puck.json"];
  if (!raw || !raw.trim()) {
    return Response.json({ data: null });
  }
  try {
    return Response.json({ data: JSON.parse(raw) as unknown });
  } catch {
    return Response.json({ data: null, error: "invalid_json" });
  }
}

async function putPuck(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response("Unauthorized", { status: 401 });
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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (!body || typeof body !== "object" || !("data" in body)) {
    return new Response("Expected { data: object }", { status: 400 });
  }
  const { data } = body as { data: unknown };
  let json: string;
  try {
    json = JSON.stringify(data);
  } catch {
    return new Response("Invalid data", { status: 400 });
  }
  if (json.length > MAX_PUCK_JSON_CHARS) {
    return new Response("Payload too large", { status: 413 });
  }
  try {
    await sandboxManager.updatePuckJson(sandboxId, json);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return new Response(message, { status: 400 });
  }
  return new Response(null, { status: 204 });
}

export const GET = withApiLogging("/api/sandbox/[id]/puck", getPuck);
export const PUT = withApiLogging("/api/sandbox/[id]/puck", putPuck);
