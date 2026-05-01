import { prisma } from "@/lib/prisma";

export type ProjectScope = {
  projectId: string;
  ownerId: string;
  name: string;
  subdomain: string;
  createdAt: Date;
};

export function normalizeProjectId(raw: string): string {
  const v = raw.trim();
  if (!v) {
    throw new Error("PROJECT_ID_REQUIRED");
  }
  if (v.length > 500) {
    throw new Error("PROJECT_ID_INVALID");
  }
  return v;
}

export function normalizeProjectName(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return "New project";
  return cleaned.slice(0, 200);
}

export function normalizeProjectSubdomain(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    throw new Error("PROJECT_SUBDOMAIN_REQUIRED");
  }
  if (normalized.length < 3 || normalized.length > 63) {
    throw new Error("PROJECT_SUBDOMAIN_INVALID");
  }
  return normalized;
}

function baseSubdomainFromName(name: string): string {
  const normalized = normalizeProjectName(name)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return normalized || "project";
}

async function ensureUniqueSubdomain(seed: string, projectId: string): Promise<string> {
  const normalizedSeed = normalizeProjectSubdomain(seed);
  const base = normalizedSeed.slice(0, 54);
  let candidate = base;
  for (let i = 0; i < 100; i += 1) {
    const row = await prisma.project.findFirst({
      where: { subdomain: candidate },
      select: { id: true }
    });
    if (!row || row.id === projectId) {
      return candidate;
    }
    candidate = `${base}-${i + 1}`;
  }
  throw new Error("PROJECT_SUBDOMAIN_UNAVAILABLE");
}

export async function upsertProjectCell(input: {
  projectId: string;
  ownerId: string;
  name: string;
  subdomain?: string;
}): Promise<ProjectScope> {
  const projectId = normalizeProjectId(input.projectId);
  const normalizedName = normalizeProjectName(input.name);
  const requestedSubdomain =
    typeof input.subdomain === "string" && input.subdomain.trim()
      ? normalizeProjectSubdomain(input.subdomain)
      : null;
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
      name: true,
      subdomain: true,
      createdAt: true
    }
  });
  if (existing) {
    if (existing.ownerId !== input.ownerId) {
      throw new Error("PROJECT_OWNERSHIP_CONFLICT");
    }
    const subdomain = await ensureUniqueSubdomain(
      requestedSubdomain ?? existing.subdomain ?? baseSubdomainFromName(normalizedName),
      projectId
    );
    const row = await prisma.project.update({
      where: { id: projectId },
      data: { name: normalizedName, subdomain },
      select: {
        id: true,
        ownerId: true,
        name: true,
        subdomain: true,
        createdAt: true
      }
    });
    return {
      projectId: row.id,
      ownerId: row.ownerId,
      name: row.name,
      subdomain: row.subdomain,
      createdAt: row.createdAt
    };
  }
  const subdomain = await ensureUniqueSubdomain(
    requestedSubdomain ?? baseSubdomainFromName(normalizedName),
    projectId
  );
  const created = await prisma.project.create({
    data: {
      id: projectId,
      ownerId: input.ownerId,
      name: normalizedName,
      subdomain
    },
    select: {
      id: true,
      ownerId: true,
      name: true,
      subdomain: true,
      createdAt: true
    }
  });
  return {
    projectId: created.id,
    ownerId: created.ownerId,
    name: created.name,
    subdomain: created.subdomain,
    createdAt: created.createdAt
  };
}

export async function getProjectScopeForOwner(
  projectId: string,
  ownerId: string
): Promise<ProjectScope | null> {
  const row = await prisma.project.findFirst({
    where: { id: normalizeProjectId(projectId), ownerId },
    select: {
      id: true,
      ownerId: true,
      name: true,
      subdomain: true,
      createdAt: true
    }
  });
  if (!row) return null;
  return {
    projectId: row.id,
    ownerId: row.ownerId,
    name: row.name,
    subdomain: row.subdomain,
    createdAt: row.createdAt
  };
}

export async function requireProjectScopeForOwner(
  projectId: string,
  ownerId: string
): Promise<ProjectScope> {
  const scope = await getProjectScopeForOwner(projectId, ownerId);
  if (!scope) {
    throw new Error("PROJECT_NOT_FOUND");
  }
  return scope;
}

export async function listProjectScopesForOwner(ownerId: string): Promise<ProjectScope[]> {
  const rows = await prisma.project.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, ownerId: true, name: true, subdomain: true, createdAt: true }
  });
  return rows.map((row) => ({
    projectId: row.id,
    ownerId: row.ownerId,
    name: row.name,
    subdomain: row.subdomain,
    createdAt: row.createdAt
  }));
}

export async function deleteProjectCellForOwner(projectId: string, ownerId: string): Promise<boolean> {
  const res = await prisma.project.deleteMany({
    where: { id: normalizeProjectId(projectId), ownerId }
  });
  return res.count > 0;
}
