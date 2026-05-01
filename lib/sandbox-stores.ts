/**
 * Регистры песочниц в памяти (memory / docker metadata).
 * Вынесено в отдельный файл без dockerode/ssh2 — иначе Webpack портит RSC clientReferenceManifest
 * (TypeError: … clientModules) для страниц App Router, которые импортируют sandbox-manager.
 */

export type MemoryState = {
  id: string;
  ownerId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  html: string;
  files: Record<string, string>;
};

export type DockerRecord = {
  sandboxId: string;
  ownerId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  containerId: string;
  ip: string;
  containerName: string;
  ttlTimer?: ReturnType<typeof setTimeout>;
};

export const memoryStore = new Map<string, MemoryState>();

export const dockerRegistry = new Map<string, DockerRecord>();

export function isLemnityAiSandboxDockerEnabled(): boolean {
  const v = (process.env.LEMNITY_AI_SANDBOX_ENABLED ?? process.env.MANUS_SANDBOX_ENABLED ?? "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Только проверка регистра — без dockerode. Для /share и публичных проверок. */
export function hasSandboxInRegistry(sandboxId: string): boolean {
  if (isLemnityAiSandboxDockerEnabled()) {
    return dockerRegistry.has(sandboxId);
  }
  return memoryStore.has(sandboxId);
}
