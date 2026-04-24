import type { NextRequest } from "next/server";

import { manusApiFetch, readManusEnvelope } from "@/lib/manus-api-client";
import { getManusApiBaseUrl, isManusFullParityEnabledServer } from "@/lib/manus-parity-config";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getManusHealth(req: NextRequest) {
  void req;
  if (!isManusFullParityEnabledServer()) {
    return Response.json({ ok: false, reason: "disabled" }, { status: 503 });
  }
  const baseUrl = getManusApiBaseUrl();
  if (!baseUrl) {
    return Response.json({ ok: false, reason: "missing_base_url" }, { status: 500 });
  }

  const started = Date.now();
  try {
    const res = await manusApiFetch("/sessions", { method: "GET" });
    const latencyMs = Date.now() - started;
    const payload = await readManusEnvelope<{ sessions?: unknown[] }>(res.clone());
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

export const GET = withApiLogging("/api/manus/health", getManusHealth);
