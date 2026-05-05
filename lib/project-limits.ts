import { prisma } from "@/lib/prisma";
import { getMaxActiveProjectsForPlan } from "@/lib/plan-config";

export async function countUserProjectsForQuota(userId: string): Promise<number> {
  return prisma.project.count({ where: { ownerId: userId } });
}

export type ProjectLimitResult =
  | { ok: true }
  | { ok: false; status: 403; limit: number; current: number; message: string };

/** Проверка перед созданием проекта (AI / песочница / мост). */
export async function checkProjectCreationAllowed(
  userId: string,
  plan: string | null | undefined
): Promise<ProjectLimitResult> {
  const limit = getMaxActiveProjectsForPlan(plan);
  const current = await countUserProjectsForQuota(userId);
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
