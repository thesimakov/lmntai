import type { NextRequest } from "next/server";

import { requestPasswordReset } from "@/lib/password-reset-service";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function postForgot(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: true }, { status: 200 });
  }
  const email = typeof body === "object" && body && "email" in body ? String((body as { email?: unknown }).email ?? "") : "";
  await requestPasswordReset(email);
  return Response.json({ ok: true }, { status: 200 });
}

export const POST = withApiLogging("/api/auth/forgot-password", postForgot);
