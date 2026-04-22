/**
 * Песочница: режим in-memory (прототип) или Docker + FastAPI ai-manus sandbox.
 * Docker: см. docker/manus-sandbox/README.md и docker-compose.manus.yml
 */
import Docker from "dockerode";

import {
  manusAllServicesRunning,
  manusFileFind,
  manusFileRead,
  manusFileWrite,
  manusSupervisorStatus,
  type ManusApiResponse
} from "@/lib/manus-sandbox-api";

type SandboxMode = "memory" | "docker";

type MemoryState = {
  id: string;
  html: string;
  files: Record<string, string>;
};

type DockerRecord = {
  sandboxId: string;
  containerId: string;
  ip: string;
  /** Docker container name (for dockerode.getContainer) */
  containerName: string;
  ttlTimer?: ReturnType<typeof setTimeout>;
};

declare global {
  // eslint-disable-next-line no-var
  var lemnitySandboxStore: Map<string, MemoryState> | undefined;
  // eslint-disable-next-line no-var
  var lemnityDockerSandboxRegistry: Map<string, DockerRecord> | undefined;
  // eslint-disable-next-line no-var
  var lemnityDockerClient: Docker | undefined;
}

const memoryStore = global.lemnitySandboxStore ?? new Map<string, MemoryState>();
if (!global.lemnitySandboxStore) {
  global.lemnitySandboxStore = memoryStore;
}

const dockerRegistry = global.lemnityDockerSandboxRegistry ?? new Map<string, DockerRecord>();
if (!global.lemnityDockerSandboxRegistry) {
  global.lemnityDockerSandboxRegistry = dockerRegistry;
}

function isManusDockerEnabled(): boolean {
  const v = (process.env.MANUS_SANDBOX_ENABLED ?? "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function manusImage(): string {
  return process.env.MANUS_SANDBOX_IMAGE ?? "manus-sandbox:local";
}

function namePrefix(): string {
  return (process.env.MANUS_SANDBOX_NAME_PREFIX ?? "lemnity-sbx").replace(/[^a-zA-Z0-9_.-]/g, "-");
}

function workdirInContainer(): string {
  return (process.env.MANUS_SANDBOX_WORKDIR ?? "/home/ubuntu").replace(/\/$/, "");
}

function ttlMs(): number {
  const m = Number.parseInt(process.env.MANUS_SANDBOX_TTL_MINUTES ?? "60", 10);
  if (!Number.isFinite(m) || m <= 0) return 0;
  return m * 60_000;
}

function getDocker(): Docker {
  if (!global.lemnityDockerClient) {
    const socket = process.env.DOCKER_HOST;
    global.lemnityDockerClient = socket?.startsWith("unix://")
      ? new Docker({ socketPath: socket.replace(/^unix:\/\//, "") })
      : new Docker();
  }
  return global.lemnityDockerClient;
}

function containerBaseUrl(ip: string): string {
  return `http://${ip}:8080`;
}

function extractContainerIp(inspect: Docker.ContainerInspectInfo): string {
  const ns = inspect.NetworkSettings;
  let ip = ns.IPAddress ?? "";
  if (!ip && ns.Networks) {
    for (const cfg of Object.values(ns.Networks)) {
      const candidate = cfg.IPAddress ?? "";
      if (candidate) {
        ip = candidate;
        break;
      }
    }
  }
  if (!ip) {
    throw new Error("Не удалось определить IP контейнера песочницы (проверьте сеть Docker).");
  }
  return ip;
}

function assertManusSuccess<T>(res: ManusApiResponse<T>, action: string): void {
  if (!res.success) {
    throw new Error(`${action}: ${res.message || "unknown error"}`);
  }
}

async function waitForSandboxReady(baseUrl: string): Promise<void> {
  const maxRetries = Number.parseInt(process.env.MANUS_SANDBOX_READY_RETRIES ?? "30", 10);
  const intervalMs = Number.parseInt(process.env.MANUS_SANDBOX_READY_INTERVAL_MS ?? "2000", 10);
  const retries = Number.isFinite(maxRetries) && maxRetries > 0 ? maxRetries : 30;
  const interval = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 2000;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const status = await manusSupervisorStatus(baseUrl);
      if (status.success && manusAllServicesRunning(status.data ?? [])) {
        return;
      }
    } catch {
      // контейнер ещё поднимает uvicorn
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Песочница не стала готовой за ${(retries * interval) / 1000} с (supervisor/status).`);
}

function toHtml(code: string) {
  if (code.includes("<html") || code.includes("<!DOCTYPE html")) {
    return code;
  }

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lemnity Preview</title>
    <style>
      body {
        margin: 0;
        font-family: Inter, system-ui, sans-serif;
        background: #0a0a0a;
        color: #fafafa;
      }
      pre {
        white-space: pre-wrap;
        padding: 24px;
        font-size: 14px;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <pre>${code.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>
  </body>
</html>`;
}

function scheduleDockerTtl(record: DockerRecord): void {
  const ms = ttlMs();
  if (ms <= 0) return;
  record.ttlTimer = setTimeout(() => {
    void destroyDockerSandbox(record.sandboxId).catch(() => {
      // ignore
    });
  }, ms);
}

async function destroyDockerSandbox(sandboxId: string): Promise<void> {
  const rec = dockerRegistry.get(sandboxId);
  if (!rec) return;
  if (rec.ttlTimer) {
    clearTimeout(rec.ttlTimer);
  }
  dockerRegistry.delete(sandboxId);
  try {
    const docker = getDocker();
    const c = docker.getContainer(rec.containerId);
    await c.remove({ force: true }).catch(() => {
      // уже удалён
    });
  } catch {
    // ignore
  }
}

async function createDockerSandbox(seed: string): Promise<{ sandboxId: string }> {
  const docker = getDocker();
  const sandboxId = crypto.randomUUID();
  const short = sandboxId.replace(/-/g, "").slice(0, 12);
  const containerName = `${namePrefix()}-${short}`.toLowerCase();

  const env: string[] = [];
  const ttlMin = process.env.MANUS_SANDBOX_SERVICE_TIMEOUT_MINUTES;
  if (ttlMin && ttlMin !== "0") {
    env.push(`SERVICE_TIMEOUT_MINUTES=${ttlMin}`);
  }
  const chromeArgs = process.env.MANUS_SANDBOX_CHROME_ARGS;
  if (chromeArgs) env.push(`CHROME_ARGS=${chromeArgs}`);

  const hostConfig: Docker.HostConfig = {
    AutoRemove: true
  };
  const net = process.env.MANUS_SANDBOX_DOCKER_NETWORK?.trim();
  if (net) {
    hostConfig.NetworkMode = net;
  }

  const createOpts: Docker.ContainerCreateOptions = {
    name: containerName,
    Image: manusImage(),
    HostConfig: hostConfig
  };
  if (env.length) {
    createOpts.Env = env;
  }
  const container = await docker.createContainer(createOpts);

  await container.start();
  const inspect = await container.inspect();
  const ip = extractContainerIp(inspect);
  const base = containerBaseUrl(ip);

  await waitForSandboxReady(base);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${seed}</title></head><body style="font-family:system-ui;padding:24px;background:#0a0a0a;color:#fafafa">Контейнер готов. Генерация…</body></html>`;
  const wd = workdirInContainer();
  const indexPath = `${wd}/index.html`;
  const writeRes = await manusFileWrite(base, indexPath, html);
  assertManusSuccess(writeRes, "file/write index.html");

  const record: DockerRecord = {
    sandboxId,
    containerId: inspect.Id,
    ip,
    containerName
  };
  dockerRegistry.set(sandboxId, record);
  scheduleDockerTtl(record);

  return { sandboxId };
}

async function applyDockerCode(sandboxId: string, code: string): Promise<{ previewUrl: string }> {
  const rec = dockerRegistry.get(sandboxId);
  if (!rec) {
    throw new Error("Песочница не найдена (возможно, истёк TTL).");
  }
  const base = containerBaseUrl(rec.ip);
  const wd = workdirInContainer();
  const html = toHtml(code);
  const indexPath = `${wd}/index.html`;
  const genPath = `${wd}/generated.txt`;

  const w1 = await manusFileWrite(base, indexPath, html, { append: false });
  assertManusSuccess(w1, "file/write index.html");
  const w2 = await manusFileWrite(base, genPath, code, { append: false });
  assertManusSuccess(w2, "file/write generated.txt");

  return { previewUrl: `/api/sandbox/${sandboxId}` };
}

async function getDockerPreviewUrl(sandboxId: string): Promise<string | null> {
  return dockerRegistry.has(sandboxId) ? `/api/sandbox/${sandboxId}` : null;
}

const EXPORT_TEXT_EXT = /\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|svg|txt|md|xml|ya?ml)$/i;
const EXPORT_MAX_FILES = 48;
const EXPORT_MAX_BYTES = 512_000;

function relativeUnderWorkdir(absPath: string, wd: string): string | null {
  const norm = absPath.replace(/\/+/g, "/");
  const prefix = wd.endsWith("/") ? wd : `${wd}/`;
  if (!norm.startsWith(prefix)) return null;
  const rel = norm.slice(prefix.length);
  return rel.length ? rel : null;
}

async function exportDockerFiles(sandboxId: string): Promise<Record<string, string>> {
  const rec = dockerRegistry.get(sandboxId);
  if (!rec) return {};
  const base = containerBaseUrl(rec.ip);
  const wd = workdirInContainer();
  const out: Record<string, string> = {};

  async function readOne(absPath: string, key: string) {
    if (out[key]) return;
    try {
      const r = await manusFileRead(base, absPath);
      if (!r.success || typeof r.data?.content !== "string") return;
      const c = r.data.content;
      if (c.length > EXPORT_MAX_BYTES) return;
      out[key] = c;
    } catch {
      // ignore
    }
  }

  for (const rel of ["index.html", "generated.txt"]) {
    await readOne(`${wd}/${rel}`, rel);
  }

  try {
    const found = await manusFileFind(base, wd, "**/*");
    if (found.success && Array.isArray(found.data?.files)) {
      let count = Object.keys(out).length;
      for (const absPath of found.data.files) {
        if (count >= EXPORT_MAX_FILES) break;
        if (typeof absPath !== "string" || !EXPORT_TEXT_EXT.test(absPath)) continue;
        const rel = relativeUnderWorkdir(absPath, wd);
        if (!rel) continue;
        await readOne(absPath, rel);
        count = Object.keys(out).length;
      }
    }
  } catch {
    // find необязателен для превью
  }

  return out;
}

/** Явное удаление контейнера (например, после сохранения проекта). */
export async function destroySandbox(sandboxId: string): Promise<void> {
  if (!isManusDockerEnabled()) {
    memoryStore.delete(sandboxId);
    return;
  }
  await destroyDockerSandbox(sandboxId);
}

export function getSandboxMode(): SandboxMode {
  return isManusDockerEnabled() ? "docker" : "memory";
}

export const sandboxManager = {
  async createSandbox(seed = "new-project") {
    if (isManusDockerEnabled()) {
      return createDockerSandbox(seed);
    }
    const id = crypto.randomUUID();
    memoryStore.set(id, {
      id,
      html: `<html><body style="font-family:Inter,sans-serif;background:#0A0A0A;color:white;padding:24px">Создаю проект: ${seed}</body></html>`,
      files: {}
    });
    return { sandboxId: id };
  },

  async applyCode(sandboxId: string, code: string) {
    if (isManusDockerEnabled()) {
      return applyDockerCode(sandboxId, code);
    }
    const html = toHtml(code);
    const next: MemoryState = {
      id: sandboxId,
      html,
      files: {
        "index.html": html,
        "generated.txt": code
      }
    };
    memoryStore.set(sandboxId, next);
    return { previewUrl: `/api/sandbox/${sandboxId}` };
  },

  async getPreviewUrl(sandboxId: string) {
    if (isManusDockerEnabled()) {
      return getDockerPreviewUrl(sandboxId);
    }
    const exists = memoryStore.get(sandboxId);
    if (!exists) return null;
    return `/api/sandbox/${sandboxId}`;
  },

  async exportFiles(sandboxId: string) {
    if (isManusDockerEnabled()) {
      return exportDockerFiles(sandboxId);
    }
    return memoryStore.get(sandboxId)?.files ?? {};
  }
};
