import { timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password-crypto";
import { ensureUserVirtualWorkspace } from "@/lib/user-virtual-storage";

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

/**
 * Первичный вход по паролю из `ADMIN_DEFAULT_*` без предварительной записи в БД
 * (частый случай: новый сервер, пользователь ещё не заведён, или hash не совпадал).
 * Работает при `NODE_ENV=development` или `ADMIN_BOOTSTRAP_ENABLED=1`.
 */
export async function tryAdminEnvCredentialsLogin(
  emailLower: string,
  plainPassword: string
): Promise<{ id: string; email: string; name: string } | null> {
  // #region agent log
  const _dbg = (reason: string, extra?: Record<string, unknown>) => {
    fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f7c7f0" },
      body: JSON.stringify({
        sessionId: "f7c7f0",
        hypothesisId: "D",
        location: "lib/admin-env-bootstrap.ts:tryAdminEnvCredentialsLogin",
        message: reason,
        data: {
          hasAdminEmailInEnv: Boolean(getConfiguredAdminEmail()),
          hasAdminPasswordInEnv: Boolean(getConfiguredAdminPassword()),
          nodeEnv: process.env.NODE_ENV ?? "unset",
          adminBootstrapFlag: process.env.ADMIN_BOOTSTRAP_ENABLED ?? "unset",
          ...extra
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
  };
  // #endregion
  if (!getConfiguredAdminEmail() || !getConfiguredAdminPassword()) {
    _dbg("no_admin_env");
    return null;
  }
  const allow = process.env.NODE_ENV === "development" || envFlag("ADMIN_BOOTSTRAP_ENABLED");
  if (!allow) {
    _dbg("bootstrap_not_allowed", { allowDev: process.env.NODE_ENV === "development" });
    return null;
  }
  const targetEmail = getConfiguredAdminEmail()!;
  const targetPass = getConfiguredAdminPassword()!;
  if (emailLower !== targetEmail) {
    _dbg("email_mismatch");
    return null;
  }
  if (!safeEqualString(plainPassword, targetPass)) {
    _dbg("password_mismatch");
    return null;
  }

  const hash = await hashPassword(plainPassword);
  const existing = await prisma.user.findUnique({ where: { email: targetEmail } });

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email: targetEmail,
        name: "Administrator",
        passwordHash: hash,
        role: "ADMIN",
        tokenBalance: UNLIMITED,
        tokenLimit: UNLIMITED
      }
    });
    await ensureUserVirtualWorkspace(created.id);
    // #region agent log
    _dbg("try_admin_ok_created", { isNew: true });
    // #endregion
    return {
      id: created.id,
      email: created.email,
      name: created.name ?? "Administrator"
    };
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      role: "ADMIN",
      tokenBalance: UNLIMITED,
      tokenLimit: UNLIMITED,
      passwordHash: hash
    }
  });
  await ensureUserVirtualWorkspace(existing.id);
  // #region agent log
  _dbg("try_admin_ok_updated", { isNew: false });
  // #endregion
  return {
    id: existing.id,
    email: existing.email,
    name: existing.name ?? "User"
  };
}
