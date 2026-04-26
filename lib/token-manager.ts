import { Prisma, type User } from "@prisma/client";

import { MIN_PASSWORD_LENGTH } from "@/lib/auth-constants";
import { hashPassword, verifyPassword } from "@/lib/password-crypto";
import { prisma } from "@/lib/prisma";
import { getEffectiveMonthlyAllowance } from "@/lib/platform-plan-settings";
import { ensureUserVirtualWorkspace } from "@/lib/user-virtual-storage";
import { MIN_TOKENS_GENERATE_STREAM, MONTHLY_TOKEN_ALLOWANCE, normalizePlanId, type PlanId } from "@/lib/plan-config";

export type Plan = PlanId;

export const PLAN_LIMITS: Record<Plan, number> = MONTHLY_TOKEN_ALLOWANCE;

async function getFreePlanAllowance() {
  return getEffectiveMonthlyAllowance("FREE");
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function ensureUser(
  email: string,
  name?: string | null,
  company?: string | null
) {
  const normalizedEmail = email.trim().toLowerCase();
  const free = await getFreePlanAllowance();
  const n = name?.trim() || null;
  const co = company?.trim() || null;
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {},
    create: {
      email: normalizedEmail,
      name: n ?? undefined,
      company: co ?? undefined,
      tokenBalance: free,
      tokenLimit: free
    }
  });
  await ensureUserVirtualWorkspace(user.id);
  return user;
}

export type RegisterWithPasswordResult =
  | User
  | { kind: "duplicate" }
  | { kind: "weak_password" };

/**
 * Создаёт пользователя с bcrypt-паролем. При занятом email — duplicate.
 */
export async function registerUserWithPassword(
  email: string,
  plainPassword: string,
  name: string,
  company?: string | null
): Promise<RegisterWithPasswordResult> {
  if (plainPassword.length < MIN_PASSWORD_LENGTH) {
    return { kind: "weak_password" };
  }
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(plainPassword);
  const free = await getFreePlanAllowance();
  try {
    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        company: company?.trim() || undefined,
        passwordHash,
        tokenBalance: free,
        tokenLimit: free
      }
    });
    await ensureUserVirtualWorkspace(created.id);
    return created;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { kind: "duplicate" };
    }
    throw e;
  }
}

/**
 * Вход по email+паролю. OAuth-only пользователь (passwordHash null) — null.
 */
export async function loginWithPassword(
  email: string,
  plainPassword: string
): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user?.passwordHash) {
    return null;
  }
  const ok = await verifyPassword(plainPassword, user.passwordHash);
  return ok ? user : null;
}

/**
 * Демо-аккаунт: пароль из env уже проверен; хеш пишем в БД.
 * При существующем хеше сравниваем bcrypt.
 * Dev без `DEMO_LOGIN_PASSWORD` не используется.
 */
export async function ensureDemoUserWithPassword(
  emailLower: string,
  name: string | null,
  company: string | undefined,
  plainPassword: string
): Promise<User | null> {
  const free = await getFreePlanAllowance();
  const n = name?.trim() || process.env.DEMO_LOGIN_NAME?.trim() || "Демо";
  const co = company?.trim() || null;
  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  const hash = await hashPassword(plainPassword);
  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email: emailLower,
        name: n,
        company: co ?? undefined,
        passwordHash: hash,
        tokenBalance: free,
        tokenLimit: free
      }
    });
    await ensureUserVirtualWorkspace(created.id);
    return created;
  }
  if (existing.passwordHash) {
    const ok = await verifyPassword(plainPassword, existing.passwordHash);
    return ok ? existing : null;
  }
  return prisma.user.update({
    where: { id: existing.id },
    data: { passwordHash: hash }
  });
}

export function hasEnoughTokens(
  user: Pick<User, "tokenBalance" | "role">,
  minimum = MIN_TOKENS_GENERATE_STREAM
) {
  if (user.role === "ADMIN") return true;
  return user.tokenBalance >= minimum;
}

export function getPlanLimit(plan: string) {
  return MONTHLY_TOKEN_ALLOWANCE[normalizePlanId(plan)];
}

/** Принимает `FREE` | `PRO` | `TEAM` и устаревший `BUSINESS` (сохраняется как `TEAM`). */
export async function applyPlan(userId: string, plan: string) {
  const normalized = normalizePlanId(plan);
  const limit = await getEffectiveMonthlyAllowance(normalized);
  return prisma.user.update({
    where: { id: userId },
    data: {
      plan: normalized,
      tokenLimit: limit,
      tokenBalance: limit
    }
  });
}
