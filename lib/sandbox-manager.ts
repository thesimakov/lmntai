/**
 * Песочница: режим in-memory (прототип) или Docker + FastAPI песочницы Lemnity AI.
 * Docker: см. docker/manus-sandbox/README.md и docker-compose.manus.yml
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- dockerode: CommonJS, типы default/instance в TS нестабильны; lazy require см. getDocker */
import path from "node:path";
import type Docker from "dockerode";

import {
  lemnityBuilderAllServicesRunning,
  lemnityBuilderFileFind,
  lemnityBuilderFileRead,
  lemnityBuilderFileWrite,
  lemnityBuilderSupervisorStatus,
  type LemnityBuilderSandboxResponse
} from "@/lib/lemnity-builder-sandbox-api";
import { materializeRemoteImagesInProject } from "@/lib/materialize-remote-images";
import {
  bundleLovableToPreviewHtml,
  lovableBundleErrorHtml,
  parseLovableFencedFiles,
  withLovableProjectScaffold
} from "@/lib/lovable-bundler";
import { clearSandboxImageAssets } from "@/lib/sandbox-image-assets";
import {
  dockerRegistry,
  isLemnityAiSandboxDockerEnabled,
  memoryStore,
  type DockerRecord,
  type MemoryState
} from "@/lib/sandbox-stores";

type SandboxMode = "memory" | "docker";

let lemnityDockerClient: any = null;

function sandboxDockerImage(): string {
  return process.env.LEMNITY_AI_SANDBOX_IMAGE ?? process.env.MANUS_SANDBOX_IMAGE ?? "manus-sandbox:local";
}

function namePrefix(): string {
  return (process.env.LEMNITY_AI_SANDBOX_NAME_PREFIX ?? process.env.MANUS_SANDBOX_NAME_PREFIX ?? "lemnity-sbx").replace(
    /[^a-zA-Z0-9_.-]/g,
    "-"
  );
}

function workdirInContainer(): string {
  return (process.env.LEMNITY_AI_SANDBOX_WORKDIR ?? process.env.MANUS_SANDBOX_WORKDIR ?? "/home/ubuntu").replace(
    /\/$/,
    ""
  );
}

function ttlMs(): number {
  const m = Number.parseInt(
    process.env.LEMNITY_AI_SANDBOX_TTL_MINUTES ?? process.env.MANUS_SANDBOX_TTL_MINUTES ?? "60",
    10
  );
  if (!Number.isFinite(m) || m <= 0) return 0;
  return m * 60_000;
}

function normalizeSandboxTitle(seed: string): string {
  const cleaned = seed.trim();
  if (!cleaned) return "Новый проект";
  return cleaned.slice(0, 120);
}

function getDocker(): any {
  if (lemnityDockerClient == null) {
    // Важно: не top-level `import "dockerode"` — Webpack тянет ssh2 и ломает RSC clientReferenceManifest.
    // Не `require("dockerode")` буквально: иначе снова статический follow. Собираем имя в рантайме.
    const dockerodeName = ["docker", "ode"].join("");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DockerMod = require(dockerodeName) as new (o?: { socketPath?: string }) => any;
    const socket = process.env.DOCKER_HOST;
    lemnityDockerClient = socket?.startsWith("unix://")
      ? new DockerMod({ socketPath: socket.replace(/^unix:\/\//, "") })
      : new DockerMod();
  }
  return lemnityDockerClient;
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

function assertBuilderSandboxSuccess<T>(res: LemnityBuilderSandboxResponse<T>, action: string): void {
  if (!res.success) {
    throw new Error(`${action}: ${res.message || "unknown error"}`);
  }
}

async function waitForSandboxReady(baseUrl: string): Promise<void> {
  const maxRetries = Number.parseInt(
    process.env.LEMNITY_AI_SANDBOX_READY_RETRIES ?? process.env.MANUS_SANDBOX_READY_RETRIES ?? "30",
    10
  );
  const intervalMs = Number.parseInt(
    process.env.LEMNITY_AI_SANDBOX_READY_INTERVAL_MS ?? process.env.MANUS_SANDBOX_READY_INTERVAL_MS ?? "2000",
    10
  );
  const retries = Number.isFinite(maxRetries) && maxRetries > 0 ? maxRetries : 30;
  const interval = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 2000;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const status = await lemnityBuilderSupervisorStatus(baseUrl);
      if (status.success && lemnityBuilderAllServicesRunning(status.data ?? [])) {
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
        font-family: Rubik, system-ui, sans-serif;
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

async function createDockerSandbox(seed: string, ownerId: string): Promise<{ sandboxId: string }> {
  const docker = getDocker();
  const sandboxId = crypto.randomUUID();
  const now = Date.now();
  const title = normalizeSandboxTitle(seed);
  const short = sandboxId.replace(/-/g, "").slice(0, 12);
  const containerName = `${namePrefix()}-${short}`.toLowerCase();

  const env: string[] = [];
  const ttlMin =
    process.env.LEMNITY_AI_SANDBOX_SERVICE_TIMEOUT_MINUTES ?? process.env.MANUS_SANDBOX_SERVICE_TIMEOUT_MINUTES;
  if (ttlMin && ttlMin !== "0") {
    env.push(`SERVICE_TIMEOUT_MINUTES=${ttlMin}`);
  }
  const chromeArgs =
    process.env.LEMNITY_AI_SANDBOX_CHROME_ARGS ?? process.env.MANUS_SANDBOX_CHROME_ARGS;
  if (chromeArgs) env.push(`CHROME_ARGS=${chromeArgs}`);

  const hostConfig: Docker.HostConfig = {
    AutoRemove: true
  };
  const net = (
    process.env.LEMNITY_AI_SANDBOX_DOCKER_NETWORK ?? process.env.MANUS_SANDBOX_DOCKER_NETWORK
  )?.trim();
  if (net) {
    hostConfig.NetworkMode = net;
  }

  const createOpts: Docker.ContainerCreateOptions = {
    name: containerName,
    Image: sandboxDockerImage(),
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
  const writeRes = await lemnityBuilderFileWrite(base, indexPath, html);
  assertBuilderSandboxSuccess(writeRes, "file/write index.html");

  const record: DockerRecord = {
    sandboxId,
    ownerId,
    title,
    createdAt: now,
    updatedAt: now,
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

  const w1 = await lemnityBuilderFileWrite(base, indexPath, html, { append: false });
  assertBuilderSandboxSuccess(w1, "file/write index.html");
  const w2 = await lemnityBuilderFileWrite(base, genPath, code, { append: false });
  assertBuilderSandboxSuccess(w2, "file/write generated.txt");
  rec.updatedAt = Date.now();

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
      const r = await lemnityBuilderFileRead(base, absPath);
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
    const found = await lemnityBuilderFileFind(base, wd, "**/*");
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
  clearSandboxImageAssets(sandboxId);
  if (!isLemnityAiSandboxDockerEnabled()) {
    memoryStore.delete(sandboxId);
    return;
  }
  await destroyDockerSandbox(sandboxId);
}

function getSandboxOwnerId(sandboxId: string): string | undefined {
  if (isLemnityAiSandboxDockerEnabled()) {
    return dockerRegistry.get(sandboxId)?.ownerId;
  }
  return memoryStore.get(sandboxId)?.ownerId;
}

export function getSandboxMode(): SandboxMode {
  return isLemnityAiSandboxDockerEnabled() ? "docker" : "memory";
}

export const sandboxManager = {
  async createSandbox(seed = "new-project", ownerId: string) {
    if (isLemnityAiSandboxDockerEnabled()) {
      return createDockerSandbox(seed, ownerId);
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    const title = normalizeSandboxTitle(seed);
    memoryStore.set(id, {
      id,
      ownerId,
      title,
      createdAt: now,
      updatedAt: now,
      html: `<html><body style="font-family:Rubik,system-ui,sans-serif;background:#0A0A0A;color:white;padding:24px">Создаю проект: ${seed}</body></html>`,
      files: {}
    });
    return { sandboxId: id };
  },

  async applyCode(sandboxId: string, code: string) {
    if (isLemnityAiSandboxDockerEnabled()) {
      return applyDockerCode(sandboxId, code);
    }
    const previous = memoryStore.get(sandboxId);
    if (!previous) {
      throw new Error("Песочница не найдена.");
    }
    const html = toHtml(code);
    const next: MemoryState = {
      id: sandboxId,
      ownerId: previous.ownerId,
      title: previous.title,
      createdAt: previous.createdAt,
      updatedAt: Date.now(),
      html,
      files: {
        "index.html": html,
        "generated.txt": code
      }
    };
    memoryStore.set(sandboxId, next);
    return { previewUrl: `/api/sandbox/${sandboxId}` };
  },

  /**
   * Режим Lovable: многофайловый React+TSX в ответе → esbuild → превью; иначе тот же путь, что `applyCode`.
   */
  async applyCodeLovable(sandboxId: string, code: string) {
    const parsed = parseLovableFencedFiles(code);
    if (!parsed) {
      return this.applyCode(sandboxId, code);
    }
    return this.applyLovableFromProjectFiles(sandboxId, parsed, code);
  },

  /**
   * Lovable: готовая карта исходников (шаблон сборки, без разбора fenced-блоков) → бандл и превью.
   */
  async applyLovableFromProjectFiles(
    sandboxId: string,
    parsed: Record<string, string>,
    generatedTxt: string
  ) {
    let projectFiles = withLovableProjectScaffold(parsed);
    const ownerId = getSandboxOwnerId(sandboxId);
    if (ownerId) {
      const { files } = await materializeRemoteImagesInProject(projectFiles, {
        sandboxId,
        userId: ownerId
      });
      projectFiles = files;
    }
    const bundle = await bundleLovableToPreviewHtml(projectFiles);
    const html = bundle.ok ? bundle.html : lovableBundleErrorHtml(bundle.error);

    if (isLemnityAiSandboxDockerEnabled()) {
      const rec = dockerRegistry.get(sandboxId);
      if (!rec) {
        throw new Error("Песочница не найдена (возможно, истёк TTL).");
      }
      const base = containerBaseUrl(rec.ip);
      const wd = workdirInContainer();
      const w0 = await lemnityBuilderFileWrite(base, `${wd}/index.html`, html, { append: false });
      assertBuilderSandboxSuccess(w0, "file/write index.html (lovable)");
      for (const [rel, content] of Object.entries(projectFiles)) {
        if (rel === "index.html") continue;
        const p = path.posix.join(wd.replace(/\/$/, ""), rel);
        const wr = await lemnityBuilderFileWrite(base, p, content, { append: false });
        assertBuilderSandboxSuccess(wr, `file/write ${rel}`);
      }
      const wGen = await lemnityBuilderFileWrite(base, `${wd}/generated.txt`, generatedTxt, { append: false });
      assertBuilderSandboxSuccess(wGen, "file/write generated.txt");
      rec.updatedAt = Date.now();
      return { previewUrl: `/api/sandbox/${sandboxId}` };
    }

    const previous = memoryStore.get(sandboxId);
    if (!previous) {
      throw new Error("Песочница не найдена.");
    }
    const files: Record<string, string> = {
      ...projectFiles,
      "index.html": html,
      "generated.txt": generatedTxt
    };
    const next: MemoryState = {
      ...previous,
      updatedAt: Date.now(),
      html,
      files
    };
    memoryStore.set(sandboxId, next);
    return { previewUrl: `/api/sandbox/${sandboxId}` };
  },

  /** Полная замена index.html (визуальный редактор превью). */
  async updateIndexHtml(sandboxId: string, html: string) {
    const trimmed = html.trim();
    if (!trimmed) {
      throw new Error("Пустой HTML.");
    }
    if (isLemnityAiSandboxDockerEnabled()) {
      const rec = dockerRegistry.get(sandboxId);
      if (!rec) {
        throw new Error("Песочница не найдена (возможно, истёк TTL).");
      }
      const base = containerBaseUrl(rec.ip);
      const wd = workdirInContainer();
      const indexPath = `${wd}/index.html`;
      const writeRes = await lemnityBuilderFileWrite(base, indexPath, trimmed, { append: false });
      assertBuilderSandboxSuccess(writeRes, "file/write index.html");
      rec.updatedAt = Date.now();
      return;
    }
    const previous = memoryStore.get(sandboxId);
    if (!previous) {
      throw new Error("Песочница не найдена.");
    }
    const next: MemoryState = {
      ...previous,
      updatedAt: Date.now(),
      html: trimmed,
      files: {
        ...previous.files,
        "index.html": trimmed
      }
    };
    memoryStore.set(sandboxId, next);
  },

  /**
   * JSON страницы Puck (lovable-cms-стиль) — `puck.json` в workdir / в памяти `files`.
   */
  async updatePuckJson(sandboxId: string, json: string) {
    if (!json.trim()) {
      throw new Error("Пустой JSON.");
    }
    if (isLemnityAiSandboxDockerEnabled()) {
      const rec = dockerRegistry.get(sandboxId);
      if (!rec) {
        throw new Error("Песочница не найдена (возможно, истёк TTL).");
      }
      const base = containerBaseUrl(rec.ip);
      const wd = workdirInContainer();
      const relPath = `${wd}/puck.json`;
      const writeRes = await lemnityBuilderFileWrite(base, relPath, json, { append: false });
      assertBuilderSandboxSuccess(writeRes, "file/write puck.json");
      rec.updatedAt = Date.now();
      return;
    }
    const previous = memoryStore.get(sandboxId);
    if (!previous) {
      throw new Error("Песочница не найдена.");
    }
    const next: MemoryState = {
      ...previous,
      updatedAt: Date.now(),
      files: {
        ...previous.files,
        "puck.json": json
      }
    };
    memoryStore.set(sandboxId, next);
  },

  async getPreviewUrl(sandboxId: string) {
    if (isLemnityAiSandboxDockerEnabled()) {
      return getDockerPreviewUrl(sandboxId);
    }
    const exists = memoryStore.get(sandboxId);
    if (!exists) return null;
    return `/api/sandbox/${sandboxId}`;
  },

  async exportFiles(sandboxId: string) {
    if (isLemnityAiSandboxDockerEnabled()) {
      return exportDockerFiles(sandboxId);
    }
    return memoryStore.get(sandboxId)?.files ?? {};
  },

  async canAccess(sandboxId: string, ownerId: string) {
    if (isLemnityAiSandboxDockerEnabled()) {
      const rec = dockerRegistry.get(sandboxId);
      if (!rec) return false;
      return rec.ownerId === ownerId;
    }
    const rec = memoryStore.get(sandboxId);
    if (!rec) return false;
    return rec.ownerId === ownerId;
  },

  hasSandbox(sandboxId: string): boolean {
    if (isLemnityAiSandboxDockerEnabled()) {
      return dockerRegistry.has(sandboxId);
    }
    return memoryStore.has(sandboxId);
  },

  async listSandboxesByOwner(ownerId: string) {
    if (isLemnityAiSandboxDockerEnabled()) {
      return Array.from(dockerRegistry.values())
        .filter((item) => item.ownerId === ownerId)
        .map((item) => ({
          sandboxId: item.sandboxId,
          title: item.title,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          previewUrl: `/api/sandbox/${item.sandboxId}`
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return Array.from(memoryStore.values())
      .filter((item) => item.ownerId === ownerId)
      .map((item) => ({
        sandboxId: item.id,
        title: item.title,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        previewUrl: `/api/sandbox/${item.id}`
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
};
