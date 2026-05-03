import type { NextRequest } from "next/server";

import { consumePasswordReset } from "@/lib/password-reset-service";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function postReset(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const token =
    typeof body === "object" && body && "token" in body ? String((body as { token?: unknown }).token ?? "") : "";
  const password =
    typeof body === "object" && body && "password" in body ? String((body as { password?: unknown }).password ?? "") : "";

  const result = await consumePasswordReset(token, password);
  if (result.ok) {
    return Response.json({ ok: true }, { status: 200 });
  }
  const err =
    result.code === "expired"
      ? "expired"
      : result.code === "weak_password"
        ? "weak_password"
        : "invalid_token";
  return Response.json({ ok: false, error: err }, { status: 400 });
}

export const POST = withApiLogging("/api/auth/reset-password", postReset);
