import { prisma } from "@/lib/prisma";
import { isLemnityAiBridgeEnabledServer } from "@/lib/lemnity-ai-bridge-config";
import { getMaxActiveProjectsForPlan } from "@/lib/plan-config";

/**
 * Сколько проектов учитываем для квоты — тот же источник, что и GET /api/projects:
 * при мосте Lemnity AI — привязанные сессии (`ManusSessionLink`), иначе все ячейки `Project`.
 */
export async function countUserProjects(userId: string): Promise<number> {
  if (isLemnityAiBridgeEnabledServer()) {
    return prisma.manusSessionLink.count({ where: { userId } });
  }
  return prisma.project.count({ where: { ownerId: userId } });
}

export type ProjectLimitResult =
  | { ok: true }
  | { ok: false; status: 403; limit: number; current: number; message: string };

/**
 * Проверка перед созданием нового проекта (новая песочница или новая сессия upstream).
 */
export async function checkProjectCreationAllowed(
  userId: string,
  plan: string | null | undefined
): Promise<ProjectLimitResult> {
  const limit = getMaxActiveProjectsForPlan(plan);
  const current = await countUserProjects(userId);
  if (current >= limit) {
    return {
      ok: false,
      status: 403,
      limit,
      current,
      message: `Достигнут лимит проектов: сейчас ${current}, по тарифу не больше ${limit}. Удалите проект в списке «Проекты» или перейдите на тариф с большим лимитом.`
    };
  }
  return { ok: true };
}
