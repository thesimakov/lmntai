import type { Session } from "next-auth";

import { getSafeServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type GuardFailure = {
  ok: false;
  status: 401 | 403 | 404;
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

export async function requireDbUser(): Promise<GuardResult<DbUserContext>> {
  const session = await getSafeServerSession();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!session || !email) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  if (session.user.demoOffline) {
    return { ok: false, status: 403, message: "Offline demo is read-only for protected operations" };
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      plan: true,
      tokenBalance: true,
      tokenLimit: true
    }
  });
  if (!user) {
    return { ok: false, status: 404, message: "User not found" };
  }
  return { ok: true, data: { session, user } };
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
