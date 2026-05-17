import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request-log";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";
import type { ErrorReportPayload } from "@/lib/error-tracker-types";

const STACK_MAX = 8_000;
const MSG_MAX   = 1_000;
const URL_MAX   = 500;
const UA_MAX    = 300;

function trunc(s: string | null | undefined, max: number): string | undefined {
  if (!s) return undefined;
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

async function resolveUserId(req: Request): Promise<string | undefined> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return undefined;
  try {
    const token = await getToken({ req: req as NextRequest, secret });
    const id = token?.userId ?? token?.sub;
    return typeof id === "string" ? id : undefined;
  } catch {
    return undefined;
  }
}

export async function logClientError(
  payload: ErrorReportPayload,
  req: Request,
): Promise<void> {
  const userId = await resolveUserId(req);
  try {
    await prisma.errorLog.create({
      data: {
        source:     payload.source,
        errorType:  payload.errorType,
        module:     payload.module,
        message:    trunc(payload.message, MSG_MAX) ?? "Unknown error",
        stack:      trunc(payload.stack, STACK_MAX),
        url:        trunc(payload.url, URL_MAX),
        method:     payload.method,
        statusCode: payload.statusCode,
        userAgent:  trunc(req.headers.get("user-agent"), UA_MAX),
        viewport:   payload.viewport,
        ip:         getClientIp(req),
        userId,
        meta:       payload.meta as object | undefined,
      },
    });
  } catch (e) {
    console.error("[error-log-db] write failed:", unknownToErrorMessage(e));
  }
}

export async function logServerError(
  err: unknown,
  req: Request,
  extra?: { module?: string; meta?: Record<string, unknown> },
): Promise<void> {
  const message = unknownToErrorMessage(err);
  const stack   = err instanceof Error ? err.stack : undefined;
  try {
    await prisma.errorLog.create({
      data: {
        source:     "server",
        errorType:  "api_5xx",
        module:     extra?.module,
        message:    trunc(message, MSG_MAX) ?? "Unknown error",
        stack:      trunc(stack, STACK_MAX),
        url:        trunc(req.url, URL_MAX),
        method:     req.method,
        statusCode: 500,
        userAgent:  trunc(req.headers.get("user-agent"), UA_MAX),
        ip:         getClientIp(req),
        meta:       extra?.meta as object | undefined,
      },
    });
  } catch (e) {
    console.error("[error-log-db] server write failed:", unknownToErrorMessage(e));
  }
}
