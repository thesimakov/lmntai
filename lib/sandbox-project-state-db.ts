import { prisma } from "@/lib/prisma";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";

function sanitizeFiles(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof key === "string" && typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

export type SandboxProjectStateRow = {
  sandboxId: string;
  ownerId: string;
  title: string;
  html: string;
  files: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
};

export async function upsertSandboxProjectState(input: {
  sandboxId: string;
  ownerId: string;
  title: string;
  html: string;
  files: Record<string, string>;
}): Promise<void> {
  try {
    await prisma.sandboxProjectState.upsert({
      where: { sandboxId: input.sandboxId },
      create: {
        sandboxId: input.sandboxId,
        ownerId: input.ownerId,
        title: input.title,
        html: input.html,
        files: input.files
      },
      update: {
        ownerId: input.ownerId,
        title: input.title,
        html: input.html,
        files: input.files
      }
    });
  } catch (err) {
    // Как список шаблонов в getBuildTemplateBySlug: живой превью на одном Node-процессе всё равно в memoryStore；
    // без БД — нельзя восстановить после рестарта / на втором инстансе.
    console.warn(
      "[sandbox-state] upsert skipped (preview may stay in-memory only):",
      unknownToErrorMessage(err)
    );
  }
}

export async function getSandboxProjectState(sandboxId: string): Promise<SandboxProjectStateRow | null> {
  const row = await prisma.sandboxProjectState.findUnique({
    where: { sandboxId },
    select: {
      sandboxId: true,
      ownerId: true,
      title: true,
      html: true,
      files: true,
      createdAt: true,
      updatedAt: true
    }
  });
  if (!row) return null;
  return {
    sandboxId: row.sandboxId,
    ownerId: row.ownerId,
    title: row.title,
    html: row.html,
    files: sanitizeFiles(row.files),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function removeSandboxProjectState(sandboxId: string): Promise<void> {
  await prisma.sandboxProjectState.deleteMany({ where: { sandboxId } });
}

export async function listSandboxProjectStatesByOwner(ownerId: string): Promise<SandboxProjectStateRow[]> {
  const rows = await prisma.sandboxProjectState.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: {
      sandboxId: true,
      ownerId: true,
      title: true,
      html: true,
      files: true,
      createdAt: true,
      updatedAt: true
    }
  });
  return rows.map((row) => ({
    sandboxId: row.sandboxId,
    ownerId: row.ownerId,
    title: row.title,
    html: row.html,
    files: sanitizeFiles(row.files),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}
