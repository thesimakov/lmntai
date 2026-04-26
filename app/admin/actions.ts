"use server";

import { revalidatePath } from "next/cache";

import {
  addTokensToUser,
  adminCreateUser,
  createManagerUser,
  deleteUserById,
  setUserPartnerStatus,
  setUserPassword,
  setUserPlan
} from "@/lib/admin-service";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-constants";
import { requireAdminUser, requireStaffPermission, requireStaffPanel } from "@/lib/auth-guards";
import { isStaffPermission, type StaffPermission } from "@/lib/staff-permissions";
import { normalizePlanId, type PlanId } from "@/lib/plan-config";
import { savePlatformPlanData, type PlatformPlanDataV1 } from "@/lib/platform-plan-settings";

function parsePlan(value: string): PlanId | null {
  if (value === "FREE" || value === "PRO" || value === "TEAM" || value === "BUSINESS") {
    return normalizePlanId(value);
  }
  return null;
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function addTokensAction(formData: FormData) {
  const guard = await requireStaffPermission("users.write");
  if (!guard.ok) {
    throw new Error(guard.message);
  }

  const userId = String(formData.get("userId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return;
  }
  await addTokensToUser(userId, amount);
  revalidateAdmin();
}

export async function setPlanAction(formData: FormData) {
  const guard = await requireStaffPermission("users.write");
  if (!guard.ok) {
    throw new Error(guard.message);
  }

  const userId = String(formData.get("userId") ?? "");
  const plan = parsePlan(String(formData.get("plan") ?? ""));
  if (!userId || !plan) {
    return;
  }
  await setUserPlan(userId, plan);
  revalidateAdmin();
}

export async function setPartnerAction(formData: FormData) {
  const guard = await requireStaffPermission("users.write");
  if (!guard.ok) {
    throw new Error(guard.message);
  }

  const userId = String(formData.get("userId") ?? "");
  const enabled = String(formData.get("isPartner") ?? "") === "true";
  if (!userId) {
    return;
  }
  await setUserPartnerStatus(userId, enabled, guard.data.user.id);
  revalidateAdmin();
}

export async function deleteUserAction(formData: FormData) {
  const guard = await requireStaffPermission("users.delete");
  if (!guard.ok) {
    throw new Error(guard.message);
  }
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === guard.data.user.id) {
    return;
  }
  await deleteUserById(userId);
  revalidateAdmin();
}

export async function createUserAction(formData: FormData) {
  const guard = await requireStaffPermission("users.write");
  if (!guard.ok) {
    throw new Error(guard.message);
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const plan = parsePlan(String(formData.get("plan") ?? "FREE") ?? "FREE");
  const roleRaw = String(formData.get("role") ?? "USER");
  const tokenBalance = Number(formData.get("tokenBalance") ?? 0);
  if (!email || !password || !plan) {
    return;
  }
  if (roleRaw === "MANAGER") {
    throw new Error("Менеджеров добавляйте в разделе «Команда»");
  }
  if (roleRaw === "ADMIN") {
    const a = await requireAdminUser();
    if (!a.ok) {
      throw new Error("Только супер-админ может выдать роль ADMIN");
    }
  }
  const role: "USER" | "ADMIN" = roleRaw === "ADMIN" ? "ADMIN" : "USER";
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Пароль: минимум ${MIN_PASSWORD_LENGTH} символов`);
  }
  const r = await adminCreateUser({
    email,
    password,
    name: name || email,
    plan,
    role,
    tokenBalance: Number.isFinite(tokenBalance) && tokenBalance >= 0 ? tokenBalance : 0
  });
  if (r && typeof r === "object" && "ok" in r && (r as { ok: false }).ok === false) {
    throw new Error("Пользователь с таким email уже существует");
  }
  revalidateAdmin();
}

export async function changeOwnPasswordAction(formData: FormData) {
  const guard = await requireStaffPanel();
  if (!guard.ok) {
    throw new Error(guard.message);
  }
  const newPass = String(formData.get("password") ?? "");
  if (newPass.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Пароль: минимум ${MIN_PASSWORD_LENGTH} символов`);
  }
  await setUserPassword(guard.data.user.id, newPass);
}

export async function saveTariffsAction(data: PlatformPlanDataV1) {
  const guard = await requireAdminUser();
  if (!guard.ok) {
    throw new Error(guard.message);
  }
  await savePlatformPlanData(data);
  revalidatePath("/admin/tariffs");
}

export async function createManagerAction(formData: FormData) {
  const guard = await requireAdminUser();
  if (!guard.ok) {
    throw new Error(guard.message);
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!email || !password) {
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Пароль: минимум ${MIN_PASSWORD_LENGTH} символов`);
  }
  const perms: StaffPermission[] = formData
    .getAll("perm")
    .map(String)
    .filter((x): x is StaffPermission => isStaffPermission(x));
  if (!perms.includes("settings")) {
    perms.push("settings");
  }
  const r = await createManagerUser({
    email,
    password,
    name: name || email,
    permissions: perms,
    createdById: guard.data.user.id
  });
  if (r && "ok" in r && (r as { ok: false }).ok === false) {
    throw new Error("Пользователь с таким email уже существует");
  }
  revalidatePath("/admin/team");
}
