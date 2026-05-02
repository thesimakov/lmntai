import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";

import { getSafeServerSession } from "@/lib/auth";
import { normalizePlanId } from "@/lib/plan-config";
import { prisma } from "@/lib/prisma";
import { fetchUserStarterPaidUntilById } from "@/lib/user-starter-paid-until-raw";
import {
  ensurePaidPlanCalendarMonthCredits,
} from "@/lib/token-monthly-rollover";
import {
  isStarterCabinetBlocked,
  STARTER_EXPIRED_LOCK_MESSAGE,
  syncStarterDailyTokenBudget,
} from "@/lib/starter-plan";
import { canAccessStaff, parsePermissionList, type StaffPermission } from "@/lib/staff-permissions";

export type GuardFailure = {
  ok: false;
  status: 401 | 403 | 404 | 503;
  message: string;
};

export type GuardSuccess<T> = {
  ok: true;
  data: T;
};

export type GuardResult<T> = GuardFailure | GuardSuccess<T>;

export type DbUserContext = {
  session: Session;
  user: {
    id: string;
    email: string;
    role: string;
    plan: string;
    tokenBalance: number;
    tokenLimit: number;
    adminPermissions: unknown;
    createdAt: Date;
    starterPaidUntil: Date | null;
  };
};

const dbUserCoreSelect = {
  id: true,
  email: true,
  role: true,
  plan: true,
  tokenBalance: true,
  tokenLimit: true,
  adminPermissions: true,
  createdAt: true,
} as const;

type DbUserCoreRow = Prisma.UserGetPayload<{ select: typeof dbUserCoreSelect }>;

type DbUserGuardRow = DbUserCoreRow & { starterPaidUntil: Date | null };

async function attachStarterPaidUntil(core: DbUserCoreRow): Promise<DbUserGuardRow> {
  const starterPaidUntil = await fetchUserStarterPaidUntilById(core.id);
  return { ...core, starterPaidUntil };
}

async function maybeSyncStarterTokens(user: DbUserGuardRow, demoOffline: boolean): Promise<DbUserGuardRow> {
  if (demoOffline) return user;
  if (normalizePlanId(user.plan) !== "FREE" || user.role === "ADMIN") return user;
  if (isStarterCabinetBlocked(user)) return user;
  await syncStarterDailyTokenBudget(user);
  const refreshed = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tokenBalance: true, tokenLimit: true },
  });
  if (!refreshed) return user;
  return { ...user, tokenBalance: refreshed.tokenBalance, tokenLimit: refreshed.tokenLimit };
}

async function maybeApplyPaidPlanMonthlyCredits(
  user: DbUserGuardRow,
  demoOffline: boolean
): Promise<DbUserGuardRow> {
  if (demoOffline || user.role === "ADMIN") return user;
  const pid = normalizePlanId(user.plan);
  if (pid !== "PRO" && pid !== "TEAM") return user;
  await ensurePaidPlanCalendarMonthCredits(user.id);
  const refreshed = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tokenBalance: true, tokenLimit: true },
  });
  if (!refreshed) return user;
  return { ...user, tokenBalance: refreshed.tokenBalance, tokenLimit: refreshed.tokenLimit };
}

export async function requireDbUser(): Promise<GuardResult<DbUserContext>> {
  const session = await getSafeServerSession();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!session || !email) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  try {
    const demoOffline = Boolean(session.user.demoOffline);
    let core = await prisma.user.findUnique({
      where: { email },
      select: dbUserCoreSelect
    });

    if (!core && session.user.demoOffline) {
      if (process.env.NODE_ENV !== "development") {
        return { ok: false, status: 403, message: "Offline demo is read-only for protected operations" };
      }
      try {
        core = await prisma.user.create({
          data: {
            email,
            name: session.user.name ?? "Demo",
            plan: "FREE",
            role: "USER",
            tokenBalance: 100_000,
            tokenLimit: 500_000,
            adminPermissions: undefined
          },
          select: dbUserCoreSelect
        });
      } catch {
        core = await prisma.user.findUnique({
          where: { email },
          select: dbUserCoreSelect
        });
        if (!core) {
          return { ok: false, status: 403, message: "Offline demo is read-only for protected operations" };
        }
      }
    }

    if (!core) {
      return { ok: false, status: 404, message: "User not found" };
    }

    let user = await attachStarterPaidUntil(core);

    if (!demoOffline && isStarterCabinetBlocked(user)) {
      return { ok: false, status: 403, message: STARTER_EXPIRED_LOCK_MESSAGE };
    }

    user = await maybeSyncStarterTokens(user, demoOffline);
    user = await maybeApplyPaidPlanMonthlyCredits(user, demoOffline);

    return { ok: true, data: { session, user } };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[requireDbUser] prisma error", err);
    return {
      ok: false,
      status: 503,
      message: `База данных недоступна или ошибка запроса: ${detail.slice(0, 200)}`
    };
  }
}

/** Только роль ADMIN (суперпользователь, не менеджер). */
export async function requireAdminUser(): Promise<GuardResult<DbUserContext>> {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return guard;
  }
  if (guard.data.user.role !== "ADMIN") {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  return guard;
}

/** Админ-панель: ADMIN или MANAGER. */
export async function requireStaffPanel(): Promise<GuardResult<DbUserContext>> {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return guard;
  }
  const r = guard.data.user.role;
  if (r !== "ADMIN" && r !== "MANAGER") {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  return guard;
}

/** Супер-админ для тарифов платформы и команды. */
export async function requireAdminRole(): Promise<GuardResult<DbUserContext>> {
  return requireAdminUser();
}

export async function requireStaffPermission(
  perm: StaffPermission
): Promise<GuardResult<DbUserContext>> {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return guard;
  }
  const { user } = guard.data;
  if (user.role === "ADMIN") {
    return guard;
  }
  if (user.role !== "MANAGER") {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  const keys = parsePermissionList(user.adminPermissions);
  if (!canAccessStaff("MANAGER", keys, perm, false)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  return guard;
}
