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

declare global {
  // eslint-disable-next-line no-var
  var lemnitySandboxStore: Map<string, MemoryState> | undefined;
  // eslint-disable-next-line no-var
  var lemnityDockerSandboxRegistry: Map<string, DockerRecord> | undefined;
}

export const memoryStore = global.lemnitySandboxStore ?? new Map<string, MemoryState>();
if (!global.lemnitySandboxStore) {
  global.lemnitySandboxStore = memoryStore;
}

export const dockerRegistry = global.lemnityDockerSandboxRegistry ?? new Map<string, DockerRecord>();
if (!global.lemnityDockerSandboxRegistry) {
  global.lemnityDockerSandboxRegistry = dockerRegistry;
}

export function isManusDockerEnabled(): boolean {
  const v = (process.env.MANUS_SANDBOX_ENABLED ?? "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Только проверка регистра — без dockerode. Для /share и публичных проверок. */
export function hasSandboxInRegistry(sandboxId: string): boolean {
  if (isManusDockerEnabled()) {
    return dockerRegistry.has(sandboxId);
  }
  return memoryStore.has(sandboxId);
}
