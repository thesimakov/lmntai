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
  appendGalleryUploadItem,
  parseGalleryMediaJson,
  PROJECT_IMAGE_GALLERY_README_TEXT,
  projectImageGalleryMediaPath,
  projectImageGalleryReadmePath,
  stringifyGalleryMedia,
  type ProjectGalleryItem
} from "@/lib/project-image-gallery";
import {
  bundleLovableToPreviewHtml,
  lovableBundleErrorHtml,
  parseLovableFencedFiles,
  withLovableProjectScaffold
} from "@/lib/lovable-bundler";
import { mergeFilesPreservingUserPuck, mergePuckForApply } from "@/lib/puck-merge-after-model-apply";
import {
  getSandboxProjectState,
  listSandboxProjectStatesByOwner,
  removeSandboxProjectState,
  upsertSandboxProjectState
} from "@/lib/sandbox-project-state-db";
import { clearSandboxImageAssets } from "@/lib/sandbox-image-assets";
import {
  getProjectScopeForOwner,
  listProjectScopesForOwner,
  upsertProjectCell
} from "@/lib/project-context";
import {
  appendProjectAction,
  ensureProjectStorageScaffold,
  removeProjectStorage
} from "@/lib/project-storage";
import {
  dockerRegistry,
  isLemnityAiSandboxDockerEnabled,
  memoryStore,
  type DockerRecord,
  type MemoryState
} from "@/lib/sandbox-stores";
import { prisma } from "@/lib/prisma";

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

async function createDockerSandbox(
  seed: string,
  ownerId: string,
  forcedProjectId?: string
): Promise<{ sandboxId: string }> {
  const docker = getDocker();
  const sandboxId = forcedProjectId?.trim() || crypto.randomUUID();
  const now = Date.now();
  const title = normalizeSandboxTitle(seed);
  await upsertProjectCell({ projectId: sandboxId, ownerId, name: title });
  await ensureProjectStorageScaffold(sandboxId);
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
  await persistDockerSnapshot({
    projectId: sandboxId,
    sandboxId,
    ownerId,
    title,
    html,
    files: { "index.html": html }
  });
  await appendProjectAction(sandboxId, {
    action: "sandbox.create",
    payload: { mode: "docker", title }
  });

  return { sandboxId };
}

async function applyDockerCode(sandboxId: string, code: string): Promise<{ previewUrl: string }> {
  const html = toHtml(code);
  const rec = dockerRegistry.get(sandboxId);
  if (!rec) {
    const prev = await getSandboxProjectState(sandboxId);
    if (!prev) {
      throw new Error("Песочница не найдена (возможно, истёк TTL).");
    }
    await upsertSandboxProjectState({
      projectId: sandboxId,
      sandboxId,
      ownerId: prev.ownerId,
      title: prev.title,
      html,
      files: {
        ...prev.files,
        "index.html": html,
        "generated.txt": code
      }
    });
    await appendProjectAction(sandboxId, {
      action: "sandbox.apply_code",
      payload: { mode: "docker", bytes: code.length }
    });
    return { previewUrl: `/api/sandbox/${sandboxId}` };
  }
  const base = containerBaseUrl(rec.ip);
  const wd = workdirInContainer();
  const indexPath = `${wd}/index.html`;
  const genPath = `${wd}/generated.txt`;

  const w1 = await lemnityBuilderFileWrite(base, indexPath, html, { append: false });
  assertBuilderSandboxSuccess(w1, "file/write index.html");
  const w2 = await lemnityBuilderFileWrite(base, genPath, code, { append: false });
  assertBuilderSandboxSuccess(w2, "file/write generated.txt");
  rec.updatedAt = Date.now();
  const prev = await getSandboxProjectState(sandboxId);
  const files = {
    ...(prev?.files ?? {}),
    "index.html": html,
    "generated.txt": code
  };
  await persistDockerSnapshot({
    projectId: sandboxId,
    sandboxId,
    ownerId: rec.ownerId,
    title: rec.title,
    html,
    files
  });
  await appendProjectAction(sandboxId, {
    action: "sandbox.apply_code",
    payload: { mode: "docker", bytes: code.length }
  });

  return { previewUrl: `/api/sandbox/${sandboxId}` };
}

async function getDockerPreviewUrl(sandboxId: string): Promise<string | null> {
  if (dockerRegistry.has(sandboxId)) return `/api/sandbox/${sandboxId}`;
  const row = await getSandboxProjectState(sandboxId);
  return row ? `/api/sandbox/${sandboxId}` : null;
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

  for (const rel of ["index.html", "generated.txt", "puck.json"]) {
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
  await clearSandboxImageAssets(sandboxId);
  if (!isLemnityAiSandboxDockerEnabled()) {
    memoryStore.delete(sandboxId);
    await removeSandboxProjectState(sandboxId);
  } else {
    await destroyDockerSandbox(sandboxId);
    await removeSandboxProjectState(sandboxId);
  }
  await prisma.project.deleteMany({ where: { id: sandboxId } });
  await removeProjectStorage(sandboxId);
}

async function getSandboxOwnerId(sandboxId: string): Promise<string | undefined> {
  if (isLemnityAiSandboxDockerEnabled()) {
    const inRegistry = dockerRegistry.get(sandboxId)?.ownerId;
    if (inRegistry) return inRegistry;
    const row = await getSandboxProjectState(sandboxId);
    return row?.ownerId;
  }
  const inMemory = memoryStore.get(sandboxId)?.ownerId;
  if (inMemory) return inMemory;
  const row = await getSandboxProjectState(sandboxId);
  return row?.ownerId;
}

export function getSandboxMode(): SandboxMode {
  return isLemnityAiSandboxDockerEnabled() ? "docker" : "memory";
}

async function hydrateMemoryStateFromDb(sandboxId: string): Promise<MemoryState | null> {
  const existing = memoryStore.get(sandboxId);
  if (existing) return existing;
  const row = await getSandboxProjectState(sandboxId);
  if (!row) return null;
  const createdAtMs = row.createdAt.getTime();
  const updatedAtMs = row.updatedAt.getTime();
  const state: MemoryState = {
    id: row.sandboxId,
    ownerId: row.ownerId,
    title: row.title,
    createdAt: Number.isFinite(createdAtMs) ? createdAtMs : Date.now(),
    updatedAt: Number.isFinite(updatedAtMs) ? updatedAtMs : Date.now(),
    html: row.html,
    files: row.files
  };
  memoryStore.set(sandboxId, state);
  return state;
}

async function persistMemoryState(state: MemoryState): Promise<void> {
  await upsertSandboxProjectState({
    projectId: state.id,
    sandboxId: state.id,
    ownerId: state.ownerId,
    title: state.title,
    html: state.html,
    files: state.files
  });
}

async function persistDockerSnapshot(input: {
  projectId: string;
  sandboxId: string;
  ownerId: string;
  title: string;
  html: string;
  files: Record<string, string>;
}): Promise<void> {
  await upsertSandboxProjectState(input);
}

export const sandboxManager = {
  async createSandbox(seed = "new-project", ownerId: string, projectId?: string) {
    if (isLemnityAiSandboxDockerEnabled()) {
      return createDockerSandbox(seed, ownerId, projectId);
    }
    const id = projectId?.trim() || crypto.randomUUID();
    const now = Date.now();
    const title = normalizeSandboxTitle(seed);
    await upsertProjectCell({ projectId: id, ownerId, name: title });
    await ensureProjectStorageScaffold(id);
    const state: MemoryState = {
      id,
      ownerId,
      title,
      createdAt: now,
      updatedAt: now,
      html: `<html><body style="font-family:Rubik,system-ui,sans-serif;background:#0A0A0A;color:white;padding:24px">Создаю проект: ${seed}</body></html>`,
      files: {}
    };
    memoryStore.set(id, state);
    await persistMemoryState(state);
    await appendProjectAction(id, {
      action: "sandbox.create",
      payload: { mode: "memory", title }
    });
    return { sandboxId: id };
  },

  async applyCode(sandboxId: string, code: string) {
    if (isLemnityAiSandboxDockerEnabled()) {
      return applyDockerCode(sandboxId, code);
    }
    const previous = memoryStore.get(sandboxId) ?? (await hydrateMemoryStateFromDb(sandboxId));
    if (!previous) {
      throw new Error("Песочница не найдена.");
    }
    const html = toHtml(code);
    const files = mergeFilesPreservingUserPuck(previous, {
      "index.html": html,
      "generated.txt": code
    });
    const next: MemoryState = {
      id: sandboxId,
      ownerId: previous.ownerId,
      title: previous.title,
      createdAt: previous.createdAt,
      updatedAt: Date.now(),
      html,
      files
    };
    memoryStore.set(sandboxId, next);
    await persistMemoryState(next);
    await appendProjectAction(sandboxId, {
      action: "sandbox.apply_code",
      payload: { mode: "memory", bytes: code.length }
    });
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
    const preExport = await this.exportFiles(sandboxId).catch(() => ({} as Record<string, string>));
    const prevPuck = preExport["puck.json"];

    let projectFiles = withLovableProjectScaffold(parsed);
    const ownerId = await getSandboxOwnerId(sandboxId);
    if (ownerId) {
      const { files } = await materializeRemoteImagesInProject(projectFiles, {
        projectId: sandboxId,
        userId: ownerId
      });
      projectFiles = files;
    }
    const puckPick = mergePuckForApply(
      typeof prevPuck === "string" ? prevPuck : undefined,
      typeof projectFiles["puck.json"] === "string" ? projectFiles["puck.json"] : undefined
    );
    if (puckPick.kind === "value") {
      projectFiles = { ...projectFiles, "puck.json": puckPick.json };
    } else {
      projectFiles = { ...projectFiles };
      delete projectFiles["puck.json"];
    }

    const bundle = await bundleLovableToPreviewHtml(projectFiles);
    const html = bundle.ok ? bundle.html : lovableBundleErrorHtml(bundle.error);

    if (isLemnityAiSandboxDockerEnabled()) {
      const rec = dockerRegistry.get(sandboxId);
      if (!rec) {
        const prev = await getSandboxProjectState(sandboxId);
        if (!prev) {
          throw new Error("Песочница не найдена (возможно, истёк TTL).");
        }
        await upsertSandboxProjectState({
          projectId: sandboxId,
          sandboxId,
          ownerId: prev.ownerId,
          title: prev.title,
          html,
          files: {
            ...prev.files,
            ...projectFiles,
            "index.html": html,
            "generated.txt": generatedTxt
          }
        });
        await appendProjectAction(sandboxId, {
          action: "sandbox.apply_lovable",
          payload: { mode: "docker", files: Object.keys(projectFiles).length }
        });
        return { previewUrl: `/api/sandbox/${sandboxId}` };
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
      await persistDockerSnapshot({
        projectId: sandboxId,
        sandboxId,
        ownerId: rec.ownerId,
        title: rec.title,
        html,
        files: {
          ...projectFiles,
          "index.html": html,
          "generated.txt": generatedTxt
        }
      });
      await appendProjectAction(sandboxId, {
        action: "sandbox.apply_lovable",
        payload: { mode: "docker", files: Object.keys(projectFiles).length }
      });
      return { previewUrl: `/api/sandbox/${sandboxId}` };
    }

    const previous = memoryStore.get(sandboxId) ?? (await hydrateMemoryStateFromDb(sandboxId));
    if (!previous) {
      throw new Error("Песочница не найдена.");
    }
    const files = mergeFilesPreservingUserPuck(previous, {
      ...projectFiles,
      "index.html": html,
      "generated.txt": generatedTxt
    });
    const next: MemoryState = {
      ...previous,
      updatedAt: Date.now(),
      html,
      files
    };
    memoryStore.set(sandboxId, next);
    await persistMemoryState(next);
    await appendProjectAction(sandboxId, {
      action: "sandbox.apply_lovable",
      payload: { mode: "memory", files: Object.keys(projectFiles).length }
    });
    return { previewUrl: `/api/sandbox/${sandboxId}` };
  },

  /** Полная замена index.html (визуальный редактор превью). Возвращает `updatedAt` для клиента (синхрон превью / кэш-баст). */
  async updateIndexHtml(sandboxId: string, html: string): Promise<number> {
    const trimmed = html.trim();
    if (!trimmed) {
      throw new Error("Пустой HTML.");
    }
    if (isLemnityAiSandboxDockerEnabled()) {
      const rec = dockerRegistry.get(sandboxId);
      if (!rec) {
        const prev = await getSandboxProjectState(sandboxId);
        if (!prev) {
          throw new Error("Песочница не найдена (возможно, истёк TTL).");
        }
        await upsertSandboxProjectState({
          projectId: sandboxId,
          sandboxId,
          ownerId: prev.ownerId,
          title: prev.title,
          html: trimmed,
          files: {
            ...prev.files,
            "index.html": trimmed
          }
        });
        await appendProjectAction(sandboxId, { action: "sandbox.update_index_html" });
        return Date.now();
      }
      const base = containerBaseUrl(rec.ip);
      const wd = workdirInContainer();
      const indexPath = `${wd}/index.html`;
      const writeRes = await lemnityBuilderFileWrite(base, indexPath, trimmed, { append: false });
      assertBuilderSandboxSuccess(writeRes, "file/write index.html");
      rec.updatedAt = Date.now();
      const prev = await getSandboxProjectState(sandboxId);
      await persistDockerSnapshot({
        projectId: sandboxId,
        sandboxId,
        ownerId: rec.ownerId,
        title: rec.title,
        html: trimmed,
        files: {
          ...(prev?.files ?? {}),
          "index.html": trimmed
        }
      });
      await appendProjectAction(sandboxId, { action: "sandbox.update_index_html" });
      return rec.updatedAt;
    }
    const previous = memoryStore.get(sandboxId) ?? (await hydrateMemoryStateFromDb(sandboxId));
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
    await persistMemoryState(next);
    await appendProjectAction(sandboxId, { action: "sandbox.update_index_html" });
    return next.updatedAt;
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
        const prev = await getSandboxProjectState(sandboxId);
        if (!prev) {
          throw new Error("Песочница не найдена (возможно, истёк TTL).");
        }
        await upsertSandboxProjectState({
          projectId: sandboxId,
          sandboxId,
          ownerId: prev.ownerId,
          title: prev.title,
          html: prev.html,
          files: {
            ...prev.files,
            "puck.json": json
          }
        });
        await appendProjectAction(sandboxId, { action: "sandbox.update_puck_json" });
        return;
      }
      const base = containerBaseUrl(rec.ip);
      const wd = workdirInContainer();
      const relPath = `${wd}/puck.json`;
      const writeRes = await lemnityBuilderFileWrite(base, relPath, json, { append: false });
      assertBuilderSandboxSuccess(writeRes, "file/write puck.json");
      rec.updatedAt = Date.now();
      const prev = await getSandboxProjectState(sandboxId);
      await persistDockerSnapshot({
        projectId: sandboxId,
        sandboxId,
        ownerId: rec.ownerId,
        title: rec.title,
        html: prev?.html ?? prev?.files?.["index.html"] ?? "",
        files: {
          ...(prev?.files ?? {}),
          "puck.json": json
        }
      });
      await appendProjectAction(sandboxId, { action: "sandbox.update_puck_json" });
      return;
    }
    const previous = memoryStore.get(sandboxId) ?? (await hydrateMemoryStateFromDb(sandboxId));
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
    await persistMemoryState(next);
    await appendProjectAction(sandboxId, { action: "sandbox.update_puck_json" });
  },

  async getPreviewUrl(sandboxId: string) {
    if (isLemnityAiSandboxDockerEnabled()) {
      return getDockerPreviewUrl(sandboxId);
    }
    const exists = memoryStore.get(sandboxId) ?? (await hydrateMemoryStateFromDb(sandboxId));
    if (!exists) return null;
    return `/api/sandbox/${sandboxId}`;
  },

  async exportFiles(sandboxId: string) {
    if (isLemnityAiSandboxDockerEnabled()) {
      const dockerFiles = await exportDockerFiles(sandboxId);
      if (Object.keys(dockerFiles).length > 0) return dockerFiles;
      const row = await getSandboxProjectState(sandboxId);
      return row?.files ?? {};
    }
    const state = memoryStore.get(sandboxId) ?? (await hydrateMemoryStateFromDb(sandboxId));
    return state?.files ?? {};
  },

  /**
   * Добавить запись о загруженном изображении в `public/images/gallery/media.json` (и README папки).
   */
  async mergeProjectGalleryAppendUploadItem(sandboxId: string, item: ProjectGalleryItem): Promise<void> {
    const files = await this.exportFiles(sandboxId);
    const galleryMediaPath = projectImageGalleryMediaPath(sandboxId);
    const galleryReadmePath = projectImageGalleryReadmePath(sandboxId);
    const prev = parseGalleryMediaJson(files[galleryMediaPath]);
    const nextGallery = appendGalleryUploadItem(prev, item);
    const patch: Record<string, string> = {
      [galleryReadmePath]: PROJECT_IMAGE_GALLERY_README_TEXT,
      [galleryMediaPath]: stringifyGalleryMedia(nextGallery)
    };
    if (isLemnityAiSandboxDockerEnabled()) {
      const rec = dockerRegistry.get(sandboxId);
      if (!rec) {
        const prevState = await getSandboxProjectState(sandboxId);
        if (!prevState) {
          throw new Error("Песочница не найдена (возможно, истёк TTL).");
        }
        await upsertSandboxProjectState({
          projectId: sandboxId,
          sandboxId,
          ownerId: prevState.ownerId,
          title: prevState.title,
          html: prevState.html,
          files: {
            ...prevState.files,
            ...patch
          }
        });
        return;
      }
      const base = containerBaseUrl(rec.ip);
      const wd = workdirInContainer();
      for (const [rel, content] of Object.entries(patch)) {
        const p = path.posix.join(wd.replace(/\/$/, ""), rel);
        const wr = await lemnityBuilderFileWrite(base, p, content, { append: false });
        assertBuilderSandboxSuccess(wr, `file/write ${rel}`);
      }
      rec.updatedAt = Date.now();
      const prevState = await getSandboxProjectState(sandboxId);
      await persistDockerSnapshot({
        projectId: sandboxId,
        sandboxId,
        ownerId: rec.ownerId,
        title: rec.title,
        html: prevState?.html ?? prevState?.files?.["index.html"] ?? "",
        files: {
          ...(prevState?.files ?? {}),
          ...patch
        }
      });
      return;
    }
    const previous = memoryStore.get(sandboxId) ?? (await hydrateMemoryStateFromDb(sandboxId));
    if (!previous) {
      throw new Error("Песочница не найдена.");
    }
    const nextState: MemoryState = {
      ...previous,
      updatedAt: Date.now(),
      files: {
        ...previous.files,
        ...patch
      }
    };
    memoryStore.set(sandboxId, nextState);
    await persistMemoryState(nextState);
  },

  async canAccess(sandboxId: string, ownerId: string) {
    const scope = await getProjectScopeForOwner(sandboxId, ownerId);
    return Boolean(scope);
  },

  async hasSandboxPersistent(sandboxId: string): Promise<boolean> {
    if (this.hasSandbox(sandboxId)) return true;
    const row = await getSandboxProjectState(sandboxId);
    return Boolean(row);
  },

  async diagnoseSandboxState(sandboxId: string) {
    const memory = memoryStore.get(sandboxId);
    const docker = dockerRegistry.get(sandboxId);
    const db = await getSandboxProjectState(sandboxId);
    const exported = await this.exportFiles(sandboxId);
    const exportedKeys = Object.keys(exported);

    return {
      sandboxId,
      mode: getSandboxMode(),
      hasSandboxInRuntime: this.hasSandbox(sandboxId),
      hasSandboxPersistent: await this.hasSandboxPersistent(sandboxId),
      runtime: {
        memory: memory
          ? {
              ownerId: memory.ownerId,
              updatedAt: memory.updatedAt,
              filesCount: Object.keys(memory.files).length,
              hasIndexHtml: typeof memory.files["index.html"] === "string",
              hasPuckJson: typeof memory.files["puck.json"] === "string"
            }
          : null,
        docker: docker
          ? {
              ownerId: docker.ownerId,
              updatedAt: docker.updatedAt,
              containerIdPrefix: docker.containerId.slice(0, 12),
              containerName: docker.containerName
            }
          : null
      },
      db: db
        ? {
            ownerId: db.ownerId,
            title: db.title,
            updatedAt: db.updatedAt.toISOString(),
            filesCount: Object.keys(db.files).length,
            hasIndexHtml: typeof db.files["index.html"] === "string",
            hasPuckJson: typeof db.files["puck.json"] === "string"
          }
        : null,
      resolvedExport: {
        filesCount: exportedKeys.length,
        hasIndexHtml: typeof exported["index.html"] === "string",
        hasGeneratedTxt: typeof exported["generated.txt"] === "string",
        hasPuckJson: typeof exported["puck.json"] === "string",
        sampleKeys: exportedKeys.slice(0, 12)
      }
    };
  },

  hasSandbox(sandboxId: string): boolean {
    if (isLemnityAiSandboxDockerEnabled()) {
      return dockerRegistry.has(sandboxId);
    }
    return memoryStore.has(sandboxId);
  },

  async listSandboxesByOwner(ownerId: string) {
    const [projects, fromDb] = await Promise.all([
      listProjectScopesForOwner(ownerId),
      listSandboxProjectStatesByOwner(ownerId)
    ]);
    const fromDbMap = new Map(fromDb.map((x) => [x.projectId, x]));
    return projects
      .map((project) => {
        const runtime =
          isLemnityAiSandboxDockerEnabled() ? dockerRegistry.get(project.projectId) : memoryStore.get(project.projectId);
        const db = fromDbMap.get(project.projectId);
        const createdAt = runtime?.createdAt ?? db?.createdAt.getTime() ?? project.createdAt.getTime();
        const updatedAt = runtime?.updatedAt ?? db?.updatedAt.getTime() ?? project.createdAt.getTime();
        const title = runtime?.title ?? db?.title ?? project.name;
        return {
          sandboxId: project.projectId,
          subdomain: project.subdomain,
          title,
          createdAt,
          updatedAt,
          previewUrl: `/api/sandbox/${project.projectId}`
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
};
