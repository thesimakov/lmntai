import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { isReservedAppHost, normalizeHost } from "@/lib/publish-domain";
import { PUBLISH_BUILTIN_BASE_DOMAIN } from "@/lib/publish-host";

export type ResolvedProject = {
  id: string;
  ownerId: string;
  name: string;
  subdomain: string;
};

type HeaderReader = {
  get(name: string): string | null;
};

function normalizeHostParts(rawHost: string): string {
  return rawHost.toLowerCase().replace(/:\d+$/, "");
}

export function extractSubdomainFromHost(rawHost: string): string | null {
  const host = normalizeHostParts(rawHost);
  const base = PUBLISH_BUILTIN_BASE_DOMAIN.toLowerCase();
  if (host === base) return null;
  if (host.endsWith(`.${base}`)) {
    const prefix = host.slice(0, -(base.length + 1));
    if (!prefix || prefix.includes(".")) return null;
    return prefix;
  }
  if (host.endsWith(".localhost")) {
    const prefix = host.slice(0, -".localhost".length);
    if (!prefix || prefix.includes(".")) return null;
    return prefix;
  }
  return null;
}

export async function findProjectByHost(rawHost: string): Promise<ResolvedProject | null> {
  const host = normalizeHost(rawHost);
  if (!host) return null;
  const direct = await prisma.publishDomainBinding.findFirst({
    where: {
      host,
      isActive: true,
      verificationStatus: "VERIFIED"
    },
    select: {
      project: {
        select: {
          id: true,
          ownerId: true,
          name: true,
          subdomain: true
        }
      }
    }
  });
  if (direct?.project) return direct.project;

  const subdomain = extractSubdomainFromHost(host);
  if (!subdomain) return null;
  const bySubdomain = await prisma.project.findUnique({
    where: { subdomain },
    select: {
      id: true,
      ownerId: true,
      name: true,
      subdomain: true
    }
  });
  return bySubdomain;
}

export async function resolveProjectFromHeaders(headersLike: HeaderReader): Promise<ResolvedProject | null> {
  const hostRaw = headersLike.get("x-forwarded-host") ?? headersLike.get("host");
  const host = normalizeHost(hostRaw);
  if (host && !isReservedAppHost(host)) {
    return findProjectByHost(host);
  }

  const fromHeader = headersLike.get("x-project-id")?.trim();
  if (fromHeader) {
    const byId = await prisma.project.findUnique({
      where: { id: fromHeader },
      select: { id: true, ownerId: true, name: true, subdomain: true }
    });
    if (byId) return byId;
  }
  return null;
}

export async function resolveProjectFromRequest(req: NextRequest | Request): Promise<ResolvedProject | null> {
  return resolveProjectFromHeaders(req.headers);
}

export async function requireProjectFromRequest(req: NextRequest | Request): Promise<ResolvedProject> {
  const project = await resolveProjectFromRequest(req);
  if (!project) {
    throw new Error("PROJECT_NOT_FOUND_FOR_HOST");
  }
  return project;
}

export function isProjectDomainRequest(req: NextRequest): boolean {
  const rawHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const host = normalizeHost(rawHost);
  if (!host) return false;
  return !isReservedAppHost(host);
}
