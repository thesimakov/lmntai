import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiOk, apiError } from "@/lib/api-response";
import { logClientError } from "@/lib/error-log-db";
import { ERROR_SOURCES, ERROR_TYPES } from "@/lib/error-tracker-types";

// In-memory sliding-window rate limiter: 30 req/min per IP.
const ipWindows = new Map<string, number[]>();
const RATE_LIMIT  = 30;
const WINDOW_MS   = 60_000;

function isRateLimited(ip: string): boolean {
  const now    = Date.now();
  const cutoff = now - WINDOW_MS;
  const hits   = (ipWindows.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_LIMIT) return true;
  hits.push(now);
  ipWindows.set(ip, hits);
  return false;
}

// Periodically prune stale Map entries to prevent unbounded growth.
// Runs at most once per 5 minutes regardless of request volume.
let lastPruneMs = 0;
function pruneStaleIpWindows(): void {
  const now = Date.now();
  if (now - lastPruneMs < 5 * 60_000) return;
  lastPruneMs = now;
  const cutoff = now - WINDOW_MS;
  for (const [ip, timestamps] of ipWindows) {
    if (timestamps.every((t) => t <= cutoff)) {
      ipWindows.delete(ip);
    }
  }
}

const ReportBody = z.object({
  source:     z.enum(ERROR_SOURCES),
  errorType:  z.enum(ERROR_TYPES),
  module:     z.string().max(64).optional(),
  message:    z.string().max(1000),
  stack:      z.string().max(8000).optional(),
  url:        z.string().max(500).optional(),
  method:     z.string().max(10).optional(),
  statusCode: z.number().int().optional(),
  viewport:   z.string().max(20).optional(),
  meta:       z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  pruneStaleIpWindows();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) return apiError("Too many requests", 429);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const result = ReportBody.safeParse(raw);
  if (!result.success) return apiError("Invalid payload", 400);

  await logClientError(result.data, req);

  return apiOk({});
}
