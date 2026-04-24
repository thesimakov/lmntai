import type { NextRequest } from "next/server";

import { isLemnityAiBridgeEnabledServer, getLemnityAiUpstreamBaseUrl } from "@/lib/lemnity-ai-bridge-config";
import { lemnityAiUpstreamFetch, readLemnityAiUpstreamEnvelope } from "@/lib/lemnity-ai-upstream-client";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getLemnityAiBridgeHealth(req: NextRequest) {
  void req;
  if (!isLemnityAiBridgeEnabledServer()) {
    return Response.json({ ok: false, reason: "disabled" }, { status: 503 });
  }
  const baseUrl = getLemnityAiUpstreamBaseUrl();
  if (!baseUrl) {
    return Response.json({ ok: false, reason: "missing_base_url" }, { status: 500 });
  }

  const started = Date.now();
  try {
    const res = await lemnityAiUpstreamFetch("/sessions", { method: "GET" });
    const latencyMs = Date.now() - started;
    const payload = await readLemnityAiUpstreamEnvelope<{ sessions?: unknown[] }>(res.clone());
    return Response.json({
      ok: res.ok && payload?.code === 0,
      status: res.status,
      latencyMs,
      baseUrl,
      code: payload?.code ?? null,
      msg: payload?.msg ?? null
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        baseUrl,
        reason: error instanceof Error ? error.message : "unknown_error"
      },
      { status: 502 }
    );
  }
}

export const GET = withApiLogging("/api/lemnity-ai/health", getLemnityAiBridgeHealth);
