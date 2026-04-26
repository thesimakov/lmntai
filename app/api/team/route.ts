import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { getEffectiveTeamSeatLimit } from "@/lib/platform-plan-settings";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

type ApiRole = "owner" | "admin" | "editor";
type ApiStatus = "active" | "invited";

function parseRole(value: unknown): "ADMIN" | "EDITOR" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "EDITOR") return normalized;
  return null;
}

function toApiRole(value: string): ApiRole {
  const normalized = value.trim().toUpperCase();
  if (normalized === "OWNER") return "owner";
  if (normalized === "ADMIN") return "admin";
  return "editor";
}

function toApiStatus(value: string): ApiStatus {
  const normalized = value.trim().toUpperCase();
  if (normalized === "ACTIVE") return "active";
  return "invited";
}

function fallbackName(email: string): string {
  return email.split("@")[0] || "Member";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mapTeamMember(
  row: {
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: Date;
    invitedUserId: string | null;
    invitedUser: { id: string; name: string | null; email: string; avatar: string | null } | null;
  },
  ownerId: string
) {
  const derivedStatus =
    row.invitedUserId || toApiStatus(row.status) === "active" ? "active" : "invited";

  return {
    id: row.id,
    ownerId,
    userId: row.invitedUser?.id ?? null,
    name: row.invitedUser?.name?.trim() || fallbackName(row.email),
    email: row.invitedUser?.email ?? row.email,
    role: toApiRole(row.role),
    status: derivedStatus,
    avatar: row.invitedUser?.avatar ?? null,
    createdAt: row.createdAt.toISOString(),
    canManage: true
  };
}

async function getTeam(req: NextRequest) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const owner = await prisma.user.findUnique({
    where: { id: guard.data.user.id },
    select: { id: true, email: true, name: true, avatar: true, plan: true }
  });
  if (!owner) {
    return new Response("User not found", { status: 404 });
  }

  const rows = await prisma.teamInvitation.findMany({
    where: { userId: owner.id },
    include: {
      invitedUser: {
        select: { id: true, name: true, email: true, avatar: true }
      }
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }]
  });

  const members = [
    {
      id: `owner:${owner.id}`,
      ownerId: owner.id,
      userId: owner.id,
      name: owner.name?.trim() || fallbackName(owner.email),
      email: owner.email,
      role: "owner" as const,
      status: "active" as const,
      avatar: owner.avatar,
      createdAt: new Date(0).toISOString(),
      canManage: false
    },
    ...rows.map((row) => mapTeamMember(row, owner.id))
  ];

  const teamSeatLimit = await getEffectiveTeamSeatLimit(owner.plan);
  const teamPlanActive = teamSeatLimit > 0;
  return Response.json({
    members,
    teamPlanActive,
    quota: {
      limit: teamSeatLimit,
      used: members.length
    }
  });
}

async function postTeam(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const ownerId = guard.data.user.id;
  const ownerEmail = guard.data.user.email.toLowerCase();
  const teamSeatLimit = await getEffectiveTeamSeatLimit(guard.data.user.plan);
  if (teamSeatLimit <= 0) {
    return new Response(
      "Команда с приглашениями доступна на тарифе Team. Оформите подписку в разделе «Тарифы».",
      { status: 403 }
    );
  }
  const body = (await req.json().catch(() => null)) as { email?: string; role?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const role = parseRole(body?.role) ?? "EDITOR";

  if (!isValidEmail(email)) {
    return new Response("Введите корректный email", { status: 400 });
  }
  if (email === ownerEmail) {
    return new Response("Владелец уже находится в команде", { status: 400 });
  }

  const existing = await prisma.teamInvitation.findUnique({
    where: { userId_email: { userId: ownerId, email } }
  });
  if (!existing) {
    const memberSlotsUsed = (await prisma.teamInvitation.count({ where: { userId: ownerId } })) + 1;
    if (memberSlotsUsed >= teamSeatLimit) {
      return new Response(`Достигнут лимит тарифа Team: до ${teamSeatLimit} участников, включая вас.`, {
        status: 400
      });
    }
  }

  const invitedUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, avatar: true }
  });

  const row = await prisma.teamInvitation.upsert({
    where: { userId_email: { userId: ownerId, email } },
    update: {
      role,
      status: invitedUser ? "ACTIVE" : "INVITED",
      invitedUserId: invitedUser?.id ?? null
    },
    create: {
      userId: ownerId,
      email,
      role,
      status: invitedUser ? "ACTIVE" : "INVITED",
      invitedUserId: invitedUser?.id ?? null
    },
    include: {
      invitedUser: {
        select: { id: true, name: true, email: true, avatar: true }
      }
    }
  });

  return Response.json(
    {
      member: mapTeamMember(row, ownerId),
      created: !existing
    },
    { status: existing ? 200 : 201 }
  );
}

export const GET = withApiLogging("/api/team", getTeam);
export const POST = withApiLogging("/api/team", postTeam);
