import { prisma } from "@/lib/prisma";
import { getMaxActiveProjectsForPlan } from "@/lib/plan-config";

/**
 * Сколько проектов уже у пользователя: в режиме моста — привязанные сессии Lemnity AI, иначе песочницы.
 */
export async function countUserProjects(userId: string): Promise<number> {
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
      message: `Достигнут лимит проектов: ${current} из ${limit}. Удалите проект в списке «Проекты» или перейдите на тариф с большим лимитом.`
    };
  }
  return { ok: true };
}
