import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getSandboxHealth(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id: sandboxId } = await params;
  const allowed = await sandboxManager.canAccess(sandboxId, guard.data.user.id);
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }
  // #region agent log
  fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0211ce" },
    body: JSON.stringify({
      sessionId: "0211ce",
      runId: "sandbox-health",
      hypothesisId: "H3",
      location: "api/sandbox/[id]/health:auth",
      message: "health access granted",
      data: { sandboxTail: sandboxId.slice(-8), userTail: guard.data.user.id.slice(-8) },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  const health = await sandboxManager.diagnoseSandboxState(sandboxId);
  // #region agent log
  fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0211ce" },
    body: JSON.stringify({
      sessionId: "0211ce",
      runId: "sandbox-health",
      hypothesisId: "H1",
      location: "api/sandbox/[id]/health:state",
      message: "runtime vs db state snapshot",
      data: {
        sandboxTail: sandboxId.slice(-8),
        hasRuntime: health.hasSandboxInRuntime,
        hasPersistent: health.hasSandboxPersistent,
        hasDb: Boolean(health.db),
        mode: health.mode
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
  // #region agent log
  fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0211ce" },
    body: JSON.stringify({
      sessionId: "0211ce",
      runId: "sandbox-health",
      hypothesisId: "H2",
      location: "api/sandbox/[id]/health:export",
      message: "resolved export files snapshot",
      data: {
        sandboxTail: sandboxId.slice(-8),
        filesCount: health.resolvedExport.filesCount,
        hasIndexHtml: health.resolvedExport.hasIndexHtml,
        hasPuckJson: health.resolvedExport.hasPuckJson
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
  return Response.json(health, { status: 200 });
}

export const GET = withApiLogging("/api/sandbox/[id]/health", getSandboxHealth);
