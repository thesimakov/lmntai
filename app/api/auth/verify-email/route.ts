import type { NextRequest } from "next/server";

import { consumeEmailVerificationToken } from "@/lib/email-verification";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  if (!token || !email) {
    return redirect(`${SITE_URL}/login?verified=invalid`);
  }

  const result = await consumeEmailVerificationToken(email, token);

  if (result.ok) {
    return redirect(`${SITE_URL}/login?verified=ok`);
  }

  if (result.code === "already_verified") {
    return redirect(`${SITE_URL}/login?verified=ok`);
  }

  if (result.code === "expired") {
    return redirect(`${SITE_URL}/login?verified=expired`);
  }

  return redirect(`${SITE_URL}/login?verified=invalid`);
}

function redirect(url: string) {
  return Response.redirect(url, 302);
}
