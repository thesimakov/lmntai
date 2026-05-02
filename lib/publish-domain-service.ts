import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";

import { prisma } from "@/lib/prisma";
import {
  canUseCustomDomain,
  getAppHosts,
  isBuiltInPublishHost,
  isReservedAppHost,
  normalizeHost
} from "@/lib/publish-domain";
import { extractSubdomainFromHost } from "@/lib/project-domain-resolution";

export type BindHostResult =
  | {
      ok: true;
      host: string;
      sandboxId: string;
      verification: {
        status: "PENDING" | "VERIFIED";
        recordType: "TXT" | null;
        recordName: string | null;
        recordValue: string | null;
        verifiedAt: string | null;
      };
    }
  | { ok: false; code: "invalid_host" | "forbidden_plan" | "reserved_host" | "forbidden_owner" };

const VERIFY_PREFIX = "_lemnity-verify";

function createVerifyToken() {
  return randomBytes(12).toString("hex");
}

function verifyRecordName(host: string) {
  return `${VERIFY_PREFIX}.${host}`;
}

function verifyRecordValue(token: string) {
  return `lemnity-verify=${token}`;
}

function verificationPayload(row: {
  host: string;
  verificationStatus: string;
  verificationToken: string | null;
  verifiedAt: Date | null;
}) {
  const verified = row.verificationStatus === "VERIFIED";
  return {
    status: verified ? ("VERIFIED" as const) : ("PENDING" as const),
    recordType: verified ? null : ("TXT" as const),
    recordName: verified ? null : verifyRecordName(row.host),
    recordValue: !verified && row.verificationToken ? verifyRecordValue(row.verificationToken) : null,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null
  };
}

export async function bindPublishHost(input: {
  ownerId: string;
  ownerPlan: string;
  sandboxId: string;
  hostRaw: string;
}): Promise<BindHostResult> {
  const host = normalizeHost(input.hostRaw);
  if (!host) return { ok: false, code: "invalid_host" };
  if (isReservedAppHost(host)) return { ok: false, code: "reserved_host" };

  let fkProjectId = input.sandboxId;
  if (input.sandboxId.startsWith("artifact_")) {
    const link = await prisma.manusSessionLink.findFirst({
      where: { userId: input.ownerId, previewArtifactId: input.sandboxId },
      select: { projectId: true }
    });
    if (!link) return { ok: false, code: "forbidden_owner" };
    fkProjectId = link.projectId;
  }

  const builtIn = isBuiltInPublishHost(host);
  if (!builtIn && !canUseCustomDomain(input.ownerPlan)) {
    return { ok: false, code: "forbidden_plan" };
  }
  const builtInSubdomain = builtIn ? extractSubdomainFromHost(host) : null;
  if (builtIn && !builtInSubdomain) {
    return { ok: false, code: "invalid_host" };
  }
  if (builtInSubdomain) {
    const occupied = await prisma.project.findUnique({
      where: { subdomain: builtInSubdomain },
      select: { id: true }
    });
    if (occupied && occupied.id !== fkProjectId) {
      return { ok: false, code: "forbidden_owner" };
    }
  }

  const existing = await prisma.publishDomainBinding.findUnique({
    where: { host },
    select: { ownerId: true, verificationToken: true, verificationStatus: true }
  });
  if (existing && existing.ownerId !== input.ownerId) {
    return { ok: false, code: "forbidden_owner" };
  }

  const now = new Date();
  const status = builtIn ? "VERIFIED" : existing?.verificationStatus ?? "PENDING";
  const token =
    builtIn
      ? null
      : existing?.verificationToken ||
        (status === "VERIFIED" ? null : createVerifyToken());

  const row = await prisma.publishDomainBinding.upsert({
    where: { host },
    create: {
      projectId: fkProjectId,
      host,
      sandboxId: input.sandboxId,
      ownerId: input.ownerId,
      isActive: true,
      verificationStatus: builtIn ? "VERIFIED" : "PENDING",
      verificationToken: builtIn ? null : token,
      verifiedAt: builtIn ? now : null,
      lastVerificationAt: builtIn ? now : null
    },
    update: {
      projectId: fkProjectId,
      sandboxId: input.sandboxId,
      ownerId: input.ownerId,
      isActive: true,
      verificationStatus: builtIn ? "VERIFIED" : status,
      verificationToken: builtIn ? null : token,
      verifiedAt: builtIn ? now : existing?.verificationStatus === "VERIFIED" ? now : null
    },
    select: {
      host: true,
      sandboxId: true,
      verificationStatus: true,
      verificationToken: true,
      verifiedAt: true
    }
  });

  if (builtInSubdomain) {
    await prisma.project.updateMany({
      where: { id: fkProjectId, ownerId: input.ownerId },
      data: { subdomain: builtInSubdomain }
    });
  }

  return {
    ok: true,
    host: row.host,
    sandboxId: row.sandboxId,
    verification: verificationPayload(row)
  };
}

export async function listPublishHostsForSandbox(ownerId: string, sandboxId: string) {
  return prisma.publishDomainBinding.findMany({
    where: {
      ownerId,
      isActive: true,
      OR: [{ sandboxId }, { projectId: sandboxId }]
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      host: true,
      verificationStatus: true,
      verificationToken: true,
      verifiedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function unbindPublishHost(input: { ownerId: string; hostRaw: string }) {
  const host = normalizeHost(input.hostRaw);
  if (!host) return { ok: false as const, code: "invalid_host" as const };
  const row = await prisma.publishDomainBinding.findUnique({
    where: { host },
    select: { id: true, ownerId: true }
  });
  if (!row) return { ok: true as const };
  if (row.ownerId !== input.ownerId) return { ok: false as const, code: "forbidden_owner" as const };
  await prisma.publishDomainBinding.update({
    where: { host },
    data: { isActive: false }
  });
  return { ok: true as const };
}

export async function resolveSandboxByHost(hostRaw: string) {
  const host = normalizeHost(hostRaw);
  if (!host || isReservedAppHost(host)) return null;
  const row = await prisma.publishDomainBinding.findFirst({
    where: { host, isActive: true, verificationStatus: "VERIFIED" },
    select: { sandboxId: true }
  });
  return row?.sandboxId ?? null;
}

export async function resolveProjectByHost(hostRaw: string): Promise<{
  projectId: string;
  subdomain: string;
} | null> {
  const host = normalizeHost(hostRaw);
  if (!host) {
    return null;
  }
  const appHosts = getAppHosts();
  if (appHosts.has(host)) {
    return null;
  }

  const byDomain = await prisma.publishDomainBinding.findFirst({
    where: { host, isActive: true, verificationStatus: "VERIFIED" },
    select: {
      project: {
        select: {
          id: true,
          subdomain: true
        }
      }
    }
  });
  if (byDomain?.project) {
    return {
      projectId: byDomain.project.id,
      subdomain: byDomain.project.subdomain
    };
  }

  const subdomain = extractSubdomainFromHost(host);
  if (!subdomain) {
    return null;
  }
  const project = await prisma.project.findUnique({
    where: { subdomain },
    select: { id: true, subdomain: true }
  });
  if (!project) {
    return null;
  }
  return {
    projectId: project.id,
    subdomain: project.subdomain
  };
}

export async function verifyPublishHost(input: { ownerId: string; hostRaw: string }) {
  const host = normalizeHost(input.hostRaw);
  if (!host) return { ok: false as const, code: "invalid_host" as const };

  const row = await prisma.publishDomainBinding.findUnique({
    where: { host },
    select: {
      host: true,
      ownerId: true,
      verificationStatus: true,
      verificationToken: true,
      verifiedAt: true,
      isActive: true
    }
  });
  if (!row || !row.isActive) return { ok: false as const, code: "not_found" as const };
  if (row.ownerId !== input.ownerId) return { ok: false as const, code: "forbidden_owner" as const };

  if (row.verificationStatus === "VERIFIED") {
    return {
      ok: true as const,
      verified: true,
      verification: verificationPayload(row)
    };
  }

  if (!row.verificationToken) {
    return { ok: false as const, code: "invalid_state" as const };
  }

  let records: string[] = [];
  try {
    const txt = await resolveTxt(verifyRecordName(host));
    records = txt.flat().map((x) => x.trim().replace(/^"|"$/g, ""));
  } catch {
    records = [];
  }
  const expected = verifyRecordValue(row.verificationToken);
  const matched = records.includes(expected);

  const updated = await prisma.publishDomainBinding.update({
    where: { host },
    data: {
      verificationStatus: matched ? "VERIFIED" : "PENDING",
      verifiedAt: matched ? new Date() : null,
      lastVerificationAt: new Date()
    },
    select: {
      host: true,
      verificationStatus: true,
      verificationToken: true,
      verifiedAt: true
    }
  });

  return {
    ok: true as const,
    verified: matched,
    verification: verificationPayload(updated)
  };
}
