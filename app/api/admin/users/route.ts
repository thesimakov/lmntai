import type { NextRequest } from "next/server";

import {
  addTokensToUser,
  listAdminUsers,
  setUserPartnerStatus,
  setUserPlan
} from "@/lib/admin-service";
import { requireAdminUser } from "@/lib/auth-guards";
import { withApiLogging } from "@/lib/with-api-logging";

async function getAdminUsers(req: NextRequest) {
  void req;
  const guard = await requireAdminUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const users = await listAdminUsers();

  return Response.json({ users });
}

export const GET = withApiLogging("/api/admin/users", getAdminUsers);

async function postAdminUsers(req: NextRequest) {
  const guard = await requireAdminUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const body = (await req.json().catch(() => null)) as
    | {
        userId?: string;
        amount?: number;
        plan?: string;
        isPartner?: boolean;
      }
    | null;

  if (action === "add-tokens") {
    const userId = body?.userId as string | undefined;
    const amount = Number(body?.amount ?? 0);
    if (!userId || !Number.isFinite(amount) || amount <= 0) {
      return new Response("Bad request", { status: 400 });
    }
    const user = await addTokensToUser(userId, amount);
    return Response.json({ ok: true, user });
  }

  if (action === "set-plan") {
    const userId = body?.userId as string | undefined;
    const plan = body?.plan;
    if (!userId || !plan || !["FREE", "PRO", "TEAM", "BUSINESS"].includes(plan)) {
      return new Response("Bad request", { status: 400 });
    }
    const user = await setUserPlan(userId, plan);
    return Response.json({ ok: true, user });
  }

  if (action === "set-partner") {
    const userId = body?.userId as string | undefined;
    const isPartner = body?.isPartner;
    if (!userId || typeof isPartner !== "boolean") {
      return new Response("Bad request", { status: 400 });
    }
    const user = await setUserPartnerStatus(userId, isPartner, guard.data.user.id);
    return Response.json({ ok: true, user });
  }

  return new Response("Unknown action", { status: 400 });
}

export const POST = withApiLogging("/api/admin/users", postAdminUsers);

