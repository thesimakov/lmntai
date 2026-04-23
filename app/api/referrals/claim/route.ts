import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { claimReferralForUser } from "@/lib/referrals";
import { REFERRAL_COOKIE_KEY } from "@/lib/referrals-constants";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

async function claimReferral(req: NextRequest) {
  const session = await getSafeServerSession();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.user.demoOffline) {
    return NextResponse.json({ status: "skipped_demo" });
  }

  const payload = (await req.json().catch(() => null)) as { code?: string } | null;
  const codeFromCookie = req.cookies.get(REFERRAL_COOKIE_KEY)?.value ?? null;
  const code = payload?.code ?? codeFromCookie;

  if (!code) {
    return NextResponse.json({ status: "no_code" });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true }
  });
  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const result = await claimReferralForUser(user.id, code);
  const res = NextResponse.json(result);
  res.cookies.set(REFERRAL_COOKIE_KEY, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax"
  });
  return res;
}

export const POST = withApiLogging("/api/referrals/claim", claimReferral);
