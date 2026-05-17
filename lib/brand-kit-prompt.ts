import { getProjectBrandKitPromptBlock } from "@/lib/project-brand-kit-service";

/** Brand kit только в рамках проекта (без глобальной библиотеки пользователя). */
export async function resolveBrandKitPromptForProject(
  projectId: string
): Promise<string | null> {
  if (!projectId.trim()) return null;
  return getProjectBrandKitPromptBlock(projectId.trim());
}
