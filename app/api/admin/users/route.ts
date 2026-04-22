import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyPlan, type Plan } from "@/lib/token-manager";
import { withApiLogging } from "@/lib/with-api-logging";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false as const, status: 401, message: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

  return { ok: true as const, adminId: user.id };
}

async function getAdminUsers(_req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      role: true,
      tokenBalance: true,
      tokenLimit: true,
      createdAt: true
    }
  });

  return Response.json({ users });
}

export const GET = withApiLogging("/api/admin/users", getAdminUsers);

async function postAdminUsers(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const body = (await req.json().catch(() => null)) as
    | {
        userId?: string;
        amount?: number;
        plan?: Plan;
      }
    | null;

  if (action === "add-tokens") {
    const userId = body?.userId as string | undefined;
    const amount = Number(body?.amount ?? 0);
    if (!userId || !Number.isFinite(amount) || amount <= 0) {
      return new Response("Bad request", { status: 400 });
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { tokenBalance: { increment: amount } }
    });
    return Response.json({ ok: true, user });
  }

  if (action === "set-plan") {
    const userId = body?.userId as string | undefined;
    const plan = body?.plan as Plan | undefined;
    if (!userId || !plan || !["FREE", "PRO", "BUSINESS"].includes(plan)) {
      return new Response("Bad request", { status: 400 });
    }
    const user = await applyPlan(userId, plan);
    return Response.json({ ok: true, user });
  }

  return new Response("Unknown action", { status: 400 });
}

export const POST = withApiLogging("/api/admin/users", postAdminUsers);

