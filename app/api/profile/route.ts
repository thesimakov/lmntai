import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

import { getSafeServerSession } from "@/lib/auth";
import { OFFLINE_DEMO_USER_ID } from "@/lib/offline-demo-auth";
import { MONTHLY_TOKEN_ALLOWANCE, normalizePlanId } from "@/lib/plan-config";
import { prisma } from "@/lib/prisma";
import { fetchUserStarterPaidUntilById } from "@/lib/user-starter-paid-until-raw";
import { requireDbUser } from "@/lib/auth-guards";
import { generateApiKey } from "@/lib/api-keys";
import { ensureUserReferralCode } from "@/lib/referrals";
import { REFERRAL_BONUS_TOKENS } from "@/lib/referrals-constants";
import {
  ensurePaidPlanCalendarMonthCredits,
} from "@/lib/token-monthly-rollover";
import {
  getStarterTrialEndsAt,
  isStarterCabinetBlocked,
  starterDailyTokenCap,
  syncStarterDailyTokenBudget,
} from "@/lib/starter-plan";
import { withApiLogging } from "@/lib/with-api-logging";

function offlineDemoUser(session: Session) {
  const u = session.user;
  if (!u?.email) {
    throw new Error("Offline demo session requires user email");
  }
  return {
    id: OFFLINE_DEMO_USER_ID,
    email: u.email,
    name: u.name ?? null,
    company: null,
    avatar: null,
    apiKey: null,
    tokenBalance: MONTHLY_TOKEN_ALLOWANCE.FREE,
    tokenLimit: MONTHLY_TOKEN_ALLOWANCE.FREE,
    plan: "FREE",
    role: "USER",
    isPartner: false,
    partnerApprovedAt: null,
    referralCode: "DEMOREF",
    referralCount: 0,
    referralRewardPerSignup: REFERRAL_BONUS_TOKENS,
    projectsCount: 0,
    tokensUsedToday: 0,
    starterCabinetBlocked: false,
    starterTrialEndsAt: null,
    starterPaidUntil: null,
    starterDailyTokenCap: MONTHLY_TOKEN_ALLOWANCE.FREE,
  };
}

async function getProfile(req: NextRequest) {
  void req;
  const session = await getSafeServerSession();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (session.user.demoOffline) {
    return Response.json({ user: offlineDemoUser(session) });
  }

  const core = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      avatar: true,
      apiKey: true,
      tokenBalance: true,
      tokenLimit: true,
      plan: true,
      role: true,
      referralCode: true,
      isPartner: true,
      partnerApprovedAt: true,
      createdAt: true,
    }
  });

  if (!core) {
    return new Response("User not found", { status: 404 });
  }

  let user: typeof core & { starterPaidUntil: Date | null } = {
    ...core,
    starterPaidUntil: await fetchUserStarterPaidUntilById(core.id),
  };

  if (
    normalizePlanId(user.plan) === "FREE" &&
    user.role !== "ADMIN" &&
    !isStarterCabinetBlocked(user)
  ) {
    await syncStarterDailyTokenBudget(user);
    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tokenBalance: true, tokenLimit: true },
    });
    if (refreshed) {
      user = { ...user, tokenBalance: refreshed.tokenBalance, tokenLimit: refreshed.tokenLimit };
    }
  } else if (
    (normalizePlanId(user.plan) === "PRO" || normalizePlanId(user.plan) === "TEAM") &&
    user.role !== "ADMIN"
  ) {
    await ensurePaidPlanCalendarMonthCredits(user.id);
    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tokenBalance: true, tokenLimit: true },
    });
    if (refreshed) {
      user = { ...user, tokenBalance: refreshed.tokenBalance, tokenLimit: refreshed.tokenLimit };
    }
  }

  const referralCode = user.referralCode ?? (await ensureUserReferralCode(user.id));
  const referralCount = await prisma.user.count({
    where: { referredById: user.id }
  });
  const projectsCount = await prisma.tokenUsageLog.count({
    where: { userId: user.id }
  });
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayUsage = await prisma.tokenUsageLog.aggregate({
    where: {
      userId: user.id,
      createdAt: { gte: startOfToday }
    },
    _sum: { totalTokens: true }
  });
  const tokensUsedToday = todayUsage._sum.totalTokens ?? 0;

  const cabinetBlocked = isStarterCabinetBlocked(user);
  const dailyCapDb =
    normalizePlanId(user.plan) === "FREE" && user.role !== "ADMIN" ? starterDailyTokenCap(user) : null;

  return Response.json({
    user: {
      ...user,
      referralCode,
      referralCount,
      referralRewardPerSignup: REFERRAL_BONUS_TOKENS,
      isPartner: user.isPartner,
      partnerApprovedAt: user.partnerApprovedAt,
      projectsCount,
      tokensUsedToday,
      starterCabinetBlocked: cabinetBlocked,
      starterTrialEndsAt: getStarterTrialEndsAt(user).toISOString(),
      starterPaidUntil: user.starterPaidUntil?.toISOString() ?? null,
      starterDailyTokenCap: typeof dailyCapDb === "number" ? dailyCapDb : null,
    }
  });
}

export const GET = withApiLogging("/api/profile", getProfile);

async function patchProfile(req: NextRequest) {
  const session = await getSafeServerSession();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (session.user.demoOffline) {
    return new Response("Профиль без базы данных недоступен для сохранения. Запустите PostgreSQL.", {
      status: 503
    });
  }

  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const body = (await req.json().catch(() => null)) as
    | { name?: string; company?: string; avatar?: string }
    | null;

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      name: body?.name,
      company: body?.company,
      avatar: body?.avatar
    },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      avatar: true,
      apiKey: true
    }
  });

  return Response.json({ user });
}

export const PATCH = withApiLogging("/api/profile", patchProfile);

async function postProfile(req: NextRequest) {
  const session = await getSafeServerSession();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (session.user.demoOffline) {
    return new Response("API-ключ без базы данных недоступен. Запустите PostgreSQL.", { status: 503 });
  }

  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action !== "generate-api-key") {
    return new Response("Unknown action", { status: 400 });
  }

  const apiKey = generateApiKey();

  await prisma.user.update({
    where: { email: session.user.email },
    data: { apiKey }
  });

  return Response.json({ apiKey });
}

export const POST = withApiLogging("/api/profile", postProfile);

