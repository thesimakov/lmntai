import type { Session } from "next-auth";

import { getSafeServerSession } from "@/lib/auth";
import { OFFLINE_DEMO_USER_ID } from "@/lib/offline-demo-auth";
import { prisma } from "@/lib/prisma";

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
  };
};

const dbUserSelect = {
  id: true,
  email: true,
  role: true,
  plan: true,
  tokenBalance: true,
  tokenLimit: true
} as const;

function offlineDemoUser(session: Session, email: string) {
  return {
    id: typeof session.user.id === "string" && session.user.id ? session.user.id : OFFLINE_DEMO_USER_ID,
    email,
    role: session.user.role ?? "USER",
    plan: session.user.plan ?? "FREE",
    tokenBalance: 100_000,
    tokenLimit: 500_000
  };
}

export async function requireDbUser(): Promise<GuardResult<DbUserContext>> {
  const session = await getSafeServerSession();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!session || !email) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  const isOfflineDemoBypass = process.env.NODE_ENV === "development" && session.user.demoOffline;
  if (isOfflineDemoBypass) {
    return {
      ok: true,
      data: {
        session,
        user: offlineDemoUser(session, email)
      }
    };
  }

  try {
    let user = await prisma.user.findUnique({
      where: { email },
      select: dbUserSelect
    });

    if (!user && session.user.demoOffline) {
      if (process.env.NODE_ENV !== "development") {
        return { ok: false, status: 403, message: "Offline demo is read-only for protected operations" };
      }
      try {
        user = await prisma.user.create({
          data: {
            email,
            name: session.user.name ?? "Demo",
            plan: "FREE",
            role: "USER",
            tokenBalance: 100_000,
            tokenLimit: 500_000
          },
          select: dbUserSelect
        });
      } catch {
        user = await prisma.user.findUnique({
          where: { email },
          select: dbUserSelect
        });
        if (!user) {
          return { ok: false, status: 403, message: "Offline demo is read-only for protected operations" };
        }
      }
    }

    if (!user) {
      return { ok: false, status: 404, message: "User not found" };
    }
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
