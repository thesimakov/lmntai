"use server";

import { addTokensToUser, setUserPartnerStatus, setUserPlan } from "@/lib/admin-service";
import { requireAdminUser } from "@/lib/auth-guards";
import { normalizePlanId, type PlanId } from "@/lib/plan-config";

function parsePlan(value: string): PlanId | null {
  if (value === "FREE" || value === "PRO" || value === "TEAM" || value === "BUSINESS") {
    return normalizePlanId(value);
  }
  return null;
}

export async function addTokensAction(formData: FormData) {
  const guard = await requireAdminUser();
  if (!guard.ok) {
    throw new Error(guard.message);
  }

  const userId = String(formData.get("userId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return;
  }
  await addTokensToUser(userId, amount);
}

export async function setPlanAction(formData: FormData) {
  const guard = await requireAdminUser();
  if (!guard.ok) {
    throw new Error(guard.message);
  }

  const userId = String(formData.get("userId") ?? "");
  const plan = parsePlan(String(formData.get("plan") ?? ""));
  if (!userId || !plan) {
    return;
  }
  await setUserPlan(userId, plan);
}

export async function setPartnerAction(formData: FormData) {
  const guard = await requireAdminUser();
  if (!guard.ok) {
    throw new Error(guard.message);
  }

  const userId = String(formData.get("userId") ?? "");
  const enabled = String(formData.get("isPartner") ?? "") === "true";
  if (!userId) {
    return;
  }
  await setUserPartnerStatus(userId, enabled, guard.data.user.id);
}
