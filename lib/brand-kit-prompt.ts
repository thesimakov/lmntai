import {
  getProjectBrandKit,
  getProjectBrandKitPromptBlock,
} from "@/lib/project-brand-kit-service";
import {
  formatProjectBrandKitForAiPrompt,
  type ProjectBrandKitManifest,
} from "@/lib/project-brand-kit-library";
import { applyProjectBrandKitToSlideGraph } from "@/lib/slide-graph/brand-kit-theme";
import type { SlideGraph } from "@/lib/slide-graph/types";

/** Brand kit только в рамках проекта (без глобальной библиотеки пользователя). */
export async function resolveBrandKitPromptForProject(
  projectId: string
): Promise<string | null> {
  if (!projectId.trim()) return null;
  return getProjectBrandKitPromptBlock(projectId.trim());
}

/** Prompt block + manifest for slide generation (single DB read). */
export async function resolveProjectBrandKitForSlides(projectId: string): Promise<{
  promptBlock: string | null;
  manifest: ProjectBrandKitManifest | null;
}> {
  const id = projectId.trim();
  if (!id) return { promptBlock: null, manifest: null };
  const library = await getProjectBrandKit(id);
  if (!library) return { promptBlock: null, manifest: null };
  return {
    promptBlock: formatProjectBrandKitForAiPrompt(library.manifest),
    manifest: library.manifest,
  };
}

export function applyBrandKitToSlideGraph(
  graph: SlideGraph,
  manifest: ProjectBrandKitManifest | null
): SlideGraph {
  return applyProjectBrandKitToSlideGraph(graph, manifest);
}
