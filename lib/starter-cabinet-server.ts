import { prisma } from "@/lib/prisma";
import { normalizePlanId } from "@/lib/plan-config";
import {
  isStarterCabinetBlocked,
  STARTER_EXPIRED_LOCK_MESSAGE,
  type StarterCabinetGateUser,
} from "@/lib/starter-plan";
import { fetchUserStarterPaidUntilById } from "@/lib/user-starter-paid-until-raw";

/** Полноэкранная блокировка ЛК для тарифа «Старт» после триала без подписки. */
export async function getStarterCabinetWallState(
  email: string | null | undefined,
  demoOffline?: boolean
): Promise<{ show: boolean; message?: string }> {
  if (demoOffline || !email) {
    return { show: false };
  }
  const row = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, plan: true, role: true, createdAt: true },
  });
  if (!row) return { show: false };
  const starterPaidUntil = await fetchUserStarterPaidUntilById(row.id);
  if (row.role === "ADMIN" || normalizePlanId(row.plan) !== "FREE") {
    return { show: false };
  }
  const gate = {
    plan: row.plan,
    role: row.role,
    createdAt: row.createdAt,
    starterPaidUntil,
  } as StarterCabinetGateUser;
  if (!isStarterCabinetBlocked(gate)) {
    return { show: false };
  }
  return { show: true, message: STARTER_EXPIRED_LOCK_MESSAGE };
}
