import { isLemnityAiBridgeEnabledServer } from "@/lib/lemnity-ai-bridge-config";
import { prisma } from "@/lib/prisma";
import { getMaxActiveProjectsForPlan } from "@/lib/plan-config";
import { sandboxManager } from "@/lib/sandbox-manager";

/**
 * Сколько проектов уже у пользователя: в режиме моста — привязанные сессии Lemnity AI, иначе песочницы.
 */
export async function countUserProjects(userId: string): Promise<number> {
  if (isLemnityAiBridgeEnabledServer()) {
    return prisma.manusSessionLink.count({ where: { userId } });
  }
  const rows = await sandboxManager.listSandboxesByOwner(userId);
  return rows.length;
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
