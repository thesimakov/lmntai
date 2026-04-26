import { timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password-crypto";

const UNLIMITED = 999_999_999;

function envFlag(name: string) {
  return process.env[name] === "true" || process.env[name] === "1";
}

/** Текущий пароль админ-входа задаётся только через env (не хранить в репозитории). */
export function getConfiguredAdminEmail(): string | null {
  const v = process.env.ADMIN_DEFAULT_EMAIL?.trim().toLowerCase();
  return v || null;
}

function getConfiguredAdminPassword(): string | null {
  const v = process.env.ADMIN_DEFAULT_PASSWORD;
  if (typeof v !== "string" || !v.length) return null;
  return v;
}

function safeEqualString(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * После успешного входа по паролю: если email/пароль совпадают с env, выдаём роль ADMIN и безлимитный баланс для тестов.
 * Включается если `ADMIN_BOOTSTRAP_ENABLED=1` или `NODE_ENV=development`.
 */
export async function applyAdminEnvBootstrap(userId: string, email: string, plainPassword: string) {
  if (!getConfiguredAdminEmail() || !getConfiguredAdminPassword()) {
    return;
  }
  const allow =
    process.env.NODE_ENV === "development" || envFlag("ADMIN_BOOTSTRAP_ENABLED");
  if (!allow) {
    return;
  }
  const targetEmail = getConfiguredAdminEmail()!;
  const targetPass = getConfiguredAdminPassword()!;
  if (email.trim().toLowerCase() !== targetEmail) {
    return;
  }
  if (!safeEqualString(plainPassword, targetPass)) {
    return;
  }
  const hash = await hashPassword(plainPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      role: "ADMIN",
      tokenBalance: UNLIMITED,
      tokenLimit: UNLIMITED,
      passwordHash: hash
    }
  });
}
