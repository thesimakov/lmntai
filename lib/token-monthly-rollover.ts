import type { PlanId } from "@/lib/plan-config";
import { normalizePlanId } from "@/lib/plan-config";
import { getEffectiveMonthlyAllowance } from "@/lib/platform-plan-settings";
import { prisma } from "@/lib/prisma";

/** Ключ календарного месяца локального времени сервера: `YYYY-MM` (совпадает со срезами токенов в профиле). */
export function calendarMonthKeyFromLocal(reference = new Date()): string {
  return `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}`;
}

export function addOneCalendarMonthKey(monthKey: string): string {
  const parts = monthKey.trim().split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]); // 1–12
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }
  const next = new Date(y, m, 1); // следующий месяц (локаль)
  return calendarMonthKeyFromLocal(next);
}

/**
 * Для каждого полного календарного месяца после последнего зачётного — одна месячная квота;
 * сумма добавляется к `tokenBalance` (остаток не сгорает).
 */
export function countCalendarMonthlyGrantsToApply(
  lastCreditedMonthKey: string | null,
  currentMonthKey: string
): number {
  if (!lastCreditedMonthKey || lastCreditedMonthKey.trim() === "") return 0;
  if (lastCreditedMonthKey >= currentMonthKey) return 0;
  let n = 0;
  let k = lastCreditedMonthKey;
  while (k < currentMonthKey) {
    k = addOneCalendarMonthKey(k);
    n++;
    if (n > 240) break;
  }
  return n;
}

function isPaidMonthlyPlan(plan: PlanId): boolean {
  return plan === "PRO" || plan === "TEAM";
}

/**
 * PRO/Team: при смене календарного месяца добавляет к балансу квоту за каждый пропущенный месяц.
 * Если поле месяца пустое — ставит текущий месяц без начисления (ожидается бэком миграция для PRO или applyPlan для новых).
 */
export async function ensurePaidPlanCalendarMonthCredits(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        plan: true,
        tokensCalendarMonthCredited: true,
      },
    });
    if (!row || row.role === "ADMIN") return;

    const pid = normalizePlanId(row.plan);
    if (!isPaidMonthlyPlan(pid)) return;

    const keyNow = calendarMonthKeyFromLocal();
    const allowance = await getEffectiveMonthlyAllowance(pid);

    const credRaw = row.tokensCalendarMonthCredited?.trim();
    if (!credRaw) {
      await tx.user.update({
        where: { id: userId },
        data: {
          tokensCalendarMonthCredited: keyNow,
          tokenLimit: allowance,
        },
      });
      return;
    }

    const months = countCalendarMonthlyGrantsToApply(credRaw, keyNow);
    if (months <= 0) {
      await tx.user.update({
        where: { id: userId },
        data: { tokenLimit: allowance },
      });
      return;
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        tokenBalance: { increment: allowance * months },
        tokensCalendarMonthCredited: keyNow,
        tokenLimit: allowance,
      },
    });
  });
}
