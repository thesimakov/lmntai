import { promises as fs } from "node:fs";
import path from "node:path";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";

const PROJECTS_ROOT = path.join(process.cwd(), ".project-storage", "projects");

const PROJECT_MESSAGES_DIR = "messages";
const PROJECT_FILES_DIR = "files";
const PROJECT_IMAGES_DIR = "images";
const PROJECT_EMBEDDINGS_DIR = "embeddings";
const FILE_SNAPSHOT_NAME = "snapshot.json";
const EMBEDDINGS_MANIFEST_NAME = "manifest.json";
const MESSAGE_LOG_NAME = "messages.jsonl";
const ACTION_LOG_NAME = "actions.jsonl";

function encodeSegment(raw: string): string {
  return encodeURIComponent(raw.trim());
}

function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function getProjectStorageRootDir(): string {
  return PROJECTS_ROOT;
}

export function getProjectStorageDir(projectId: string): string {
  return path.join(PROJECTS_ROOT, encodeSegment(projectId));
}

export function getProjectStorageImagePath(projectId: string, assetKey: string): string {
  return path.join(getProjectStorageDir(projectId), PROJECT_IMAGES_DIR, encodeSegment(assetKey));
}

export async function ensureProjectStorageScaffold(projectId: string): Promise<void> {
  const dir = getProjectStorageDir(projectId);
  await Promise.all([
    fs.mkdir(path.join(dir, PROJECT_MESSAGES_DIR), { recursive: true }),
    fs.mkdir(path.join(dir, PROJECT_FILES_DIR), { recursive: true }),
    fs.mkdir(path.join(dir, PROJECT_IMAGES_DIR), { recursive: true }),
    fs.mkdir(path.join(dir, PROJECT_EMBEDDINGS_DIR), { recursive: true })
  ]);
  const embeddingsManifest = path.join(dir, PROJECT_EMBEDDINGS_DIR, EMBEDDINGS_MANIFEST_NAME);
  try {
    await fs.access(embeddingsManifest);
  } catch {
    await fs.writeFile(
      embeddingsManifest,
      `${JSON.stringify({ projectId, namespace: projectId, vectors: [] }, null, 2)}\n`,
      "utf8"
    );
  }
}

export async function removeProjectStorage(projectId: string): Promise<void> {
  const dir = getProjectStorageDir(projectId);
  await fs.rm(dir, { recursive: true, force: true });
}

export async function persistProjectFilesSnapshot(
  projectId: string,
  files: Record<string, string>
): Promise<void> {
  await ensureProjectStorageScaffold(projectId);
  const snapshotPath = path.join(getProjectStorageDir(projectId), PROJECT_FILES_DIR, FILE_SNAPSHOT_NAME);
  await fs.writeFile(snapshotPath, `${JSON.stringify(files, null, 2)}\n`, "utf8");
}

export async function readProjectFilesSnapshot(projectId: string): Promise<Record<string, string>> {
  const snapshotPath = path.join(getProjectStorageDir(projectId), PROJECT_FILES_DIR, FILE_SNAPSHOT_NAME);
  try {
    const raw = await fs.readFile(snapshotPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === "string" && typeof v === "string") {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function writeProjectImageAsset(input: {
  projectId: string;
  assetKey: string;
  mime: string;
  data: Buffer;
}): Promise<void> {
  await ensureProjectStorageScaffold(input.projectId);
  const imagePath = getProjectStorageImagePath(input.projectId, input.assetKey);
  const metaPath = `${imagePath}.meta.json`;
  await fs.writeFile(imagePath, input.data);
  await fs.writeFile(
    metaPath,
    `${JSON.stringify({ key: input.assetKey, mime: input.mime, size: input.data.length }, null, 2)}\n`,
    "utf8"
  );
}

export async function readProjectImageAsset(
  projectId: string,
  assetKey: string
): Promise<{ mime: string; data: Buffer } | null> {
  const imagePath = getProjectStorageImagePath(projectId, assetKey);
  const metaPath = `${imagePath}.meta.json`;
  try {
    const [data, metaRaw] = await Promise.all([fs.readFile(imagePath), fs.readFile(metaPath, "utf8")]);
    const meta = JSON.parse(metaRaw) as { mime?: unknown };
    const mime = typeof meta.mime === "string" ? meta.mime : "application/octet-stream";
    return { mime, data };
  } catch {
    return null;
  }
}

export async function clearProjectImageAssets(projectId: string): Promise<void> {
  const dir = path.join(getProjectStorageDir(projectId), PROJECT_IMAGES_DIR);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

export async function appendProjectMessage(
  projectId: string,
  input: { role: string; content: string; metadata?: Record<string, unknown> }
): Promise<void> {
  await ensureProjectStorageScaffold(projectId);
  const logPath = path.join(getProjectStorageDir(projectId), PROJECT_MESSAGES_DIR, MESSAGE_LOG_NAME);
  const line = {
    ts: new Date().toISOString(),
    role: input.role,
    content: input.content,
    metadata: input.metadata ?? null
  };
  await fs.appendFile(logPath, `${JSON.stringify(line)}\n`, "utf8");
  await prisma.projectMessage.create({
    data: {
      projectId,
      role: input.role,
      content: input.content,
      metadata: toNullableJsonValue(input.metadata)
    }
  }).catch(() => {});
}

export async function appendProjectAction(
  projectId: string,
  input: { action: string; payload?: Record<string, unknown> }
): Promise<void> {
  await ensureProjectStorageScaffold(projectId);
  const logPath = path.join(getProjectStorageDir(projectId), PROJECT_MESSAGES_DIR, ACTION_LOG_NAME);
  const line = {
    ts: new Date().toISOString(),
    action: input.action,
    payload: input.payload ?? null
  };
  await fs.appendFile(logPath, `${JSON.stringify(line)}\n`, "utf8");
  await prisma.projectActionLog.create({
    data: {
      projectId,
      action: input.action,
      payload: toNullableJsonValue(input.payload)
    }
  }).catch(() => {});
}

async function collectFilesRecursive(baseDir: string, currentDir: string): Promise<Array<{ rel: string; data: Buffer }>> {
  let items: Array<{ rel: string; data: Buffer }> = [];
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectFilesRecursive(baseDir, abs);
      items = items.concat(nested);
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      const data = await fs.readFile(abs);
      const rel = path.relative(baseDir, abs).replaceAll(path.sep, "/");
      items.push({ rel, data });
    } catch (error) {
      console.warn("[project-storage] failed to read file:", relPathSafe(abs), unknownToErrorMessage(error));
    }
  }
  return items;
}

function relPathSafe(p: string): string {
  return p.replace(process.cwd(), ".");
}

function toNullableJsonValue(
  value: Record<string, unknown> | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value == null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function collectProjectStorageFiles(projectId: string): Promise<Array<{ relPath: string; data: Buffer }>> {
  const root = getProjectStorageDir(projectId);
  try {
    await fs.access(root);
  } catch {
    return [];
  }
  const rows = await collectFilesRecursive(root, root);
  return rows.map((row) => ({
    relPath: path.posix.join("projects", encodeSegment(projectId), row.rel),
    data: row.data
  }));
}

export function decodeProjectStorageSegment(encoded: string): string {
  return decodeSegment(encoded);
}
