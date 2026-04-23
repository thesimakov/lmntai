import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

function parseRole(value: unknown): "ADMIN" | "EDITOR" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "EDITOR") return normalized;
  return null;
}

function toApiRole(value: string): "admin" | "editor" {
  return value.trim().toUpperCase() === "ADMIN" ? "admin" : "editor";
}

function toApiStatus(value: string): "active" | "invited" {
  return value.trim().toUpperCase() === "ACTIVE" ? "active" : "invited";
}

function fallbackName(email: string): string {
  return email.split("@")[0] || "Member";
}

function mapMember(row: {
  id: string;
  userId: string;
  invitedUserId: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  invitedUser: { id: string; name: string | null; email: string; avatar: string | null } | null;
}) {
  return {
    id: row.id,
    ownerId: row.userId,
    userId: row.invitedUser?.id ?? row.invitedUserId,
    name: row.invitedUser?.name?.trim() || fallbackName(row.email),
    email: row.invitedUser?.email ?? row.email,
    role: toApiRole(row.role),
    status: row.invitedUserId ? "active" : toApiStatus(row.status),
    avatar: row.invitedUser?.avatar ?? null,
    createdAt: row.createdAt.toISOString(),
    canManage: true
  };
}

async function patchTeamMember(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { role?: string } | null;
  const role = parseRole(body?.role);
  if (!role) {
    return new Response("Некорректная роль", { status: 400 });
  }

  const exists = await prisma.teamInvitation.findFirst({
    where: { id, userId: guard.data.user.id },
    select: { id: true }
  });
  if (!exists) {
    return new Response("Участник не найден", { status: 404 });
  }

  const row = await prisma.teamInvitation.update({
    where: { id },
    data: { role },
    include: {
      invitedUser: {
        select: { id: true, name: true, email: true, avatar: true }
      }
    }
  });

  return Response.json({ member: mapMember(row) });
}

async function deleteTeamMember(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const { id } = await params;
  const exists = await prisma.teamInvitation.findFirst({
    where: { id, userId: guard.data.user.id },
    select: { id: true }
  });
  if (!exists) {
    return new Response("Участник не найден", { status: 404 });
  }

  await prisma.teamInvitation.delete({ where: { id } });
  return new Response(null, { status: 204 });
}

export const PATCH = withApiLogging("/api/team/[id]", patchTeamMember);
export const DELETE = withApiLogging("/api/team/[id]", deleteTeamMember);
