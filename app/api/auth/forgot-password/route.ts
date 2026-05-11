import type { NextRequest } from "next/server";

import { apiError } from "@/lib/api-response";
import { requestPasswordReset } from "@/lib/password-reset-service";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function postForgot(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }
  const email =
    typeof body === "object" && body && "email" in body
      ? String((body as { email?: unknown }).email ?? "")
      : "";
  try {
    await requestPasswordReset(email);
  } catch (e) {
    console.error("[forgot-password] requestPasswordReset failed", e);
    return apiError("Internal error", 500);
  }
  return Response.json({ ok: true });
}

export const POST = withApiLogging("/api/auth/forgot-password", postForgot);
