import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const MAX_PREVIEW = 12_000;

function truncate(value: string | null | undefined, max: number): string | undefined {
  if (value == null || value === "") return undefined;
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return truncate(forwarded.split(",")[0]?.trim(), 128);
  }
  const realIp = req.headers.get("x-real-ip");
  return truncate(realIp, 128);
}

export async function captureJsonBodyPreview(req: Request): Promise<string | undefined> {
  const method = req.method;
  if (method === "GET" || method === "HEAD") return undefined;
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return undefined;
  try {
    const text = await req.clone().text();
    return text.length <= MAX_PREVIEW ? text : `${text.slice(0, MAX_PREVIEW)}…`;
  } catch {
    return undefined;
  }
}

export async function logRequestEntry(input: {
  req: Request;
  pathname: string;
  userId?: string | null;
  statusCode: number;
  durationMs: number;
  bodyPreview?: string | null;
  error?: string | null;
}) {
  try {
    const url = new URL(input.req.url);
    await prisma.requestLog.create({
      data: {
        method: input.req.method,
        pathname: input.pathname,
        search: truncate(url.search || undefined, 2000),
        statusCode: input.statusCode,
        durationMs: input.durationMs,
        userId: input.userId ?? undefined,
        ip: getClientIp(input.req),
        userAgent: truncate(input.req.headers.get("user-agent"), 512),
        referer: truncate(input.req.headers.get("referer"), 512),
        bodyPreview: input.bodyPreview ? truncate(input.bodyPreview, MAX_PREVIEW) : undefined,
        error: input.error ? truncate(input.error, 4000) : undefined
      }
    });
  } catch (err) {
    console.error("[request-log] persist failed", err);
  }
}

export async function logAuthEvent(input: {
  userId?: string | null;
  action: string;
  provider?: string | null;
  email?: string | null;
  req?: Request | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await prisma.authEventLog.create({
      data: {
        userId: input.userId ?? undefined,
        action: input.action,
        provider: input.provider ?? undefined,
        email: input.email ?? undefined,
        ip: input.req ? getClientIp(input.req) : undefined,
        userAgent: input.req ? truncate(input.req.headers.get("user-agent"), 512) : undefined,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined
      }
    });
  } catch (err) {
    console.error("[auth-event-log] persist failed", err);
  }
}
