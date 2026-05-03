import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-constants";
import { hashPassword } from "@/lib/password-crypto";
import { isNotisendApiConfigured, sendPasswordResetEmail } from "@/lib/notisend-email";
import { normalizeEmail } from "@/lib/auth-normalizers";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 час

function hashToken(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

/**
 * Всегда отвечает одинаково снаружи (без перечисления email).
 * Письмо только если NotiSend настроен и у пользователя есть passwordHash.
 */
export async function requestPasswordReset(emailRaw: string): Promise<{ sent: boolean }> {
  const email = normalizeEmail(emailRaw);
  if (!email) {
    return { sent: false };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true }
  });

  if (!user?.passwordHash) {
    return { sent: false };
  }

  if (!isNotisendApiConfigured()) {
    console.warn("[password-reset] NOTISEND_API_KEY не задан — письмо не отправить");
    return { sent: false };
  }

  const templateReset = Boolean(process.env.NOTISEND_PASSWORD_RESET_TEMPLATE_ID?.trim());
  const fromOk =
    Boolean(process.env.NOTISEND_FROM_EMAIL?.trim()) || Boolean(process.env.EMAIL_FROM?.trim());
  if (!templateReset && !fromOk) {
    console.warn("[password-reset] Нужен NOTISEND_PASSWORD_RESET_TEMPLATE_ID или NOTISEND_FROM_EMAIL/EMAIL_FROM");
    return { sent: false };
  }

  const secret = randomBytes(32).toString("hex");
  const tokenHash = hashToken(secret);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt }
    })
  ]);

  const mailed = await sendPasswordResetEmail({
    email: user.email,
    name: user.name,
    resetToken: secret
  });

  if (!mailed) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    return { sent: false };
  }

  return { sent: true };
}

export type ConsumeResetResult =
  | { ok: true }
  | { ok: false; code: "invalid_token" | "expired" | "weak_password" | "user_missing" };

export async function consumePasswordReset(tokenRaw: string, newPassword: string): Promise<ConsumeResetResult> {
  const token = tokenRaw?.trim();
  if (!token || token.length < 32) {
    return { ok: false, code: "invalid_token" };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, code: "weak_password" };
  }

  const tokenHash = hashToken(token);
  const row = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true }
  });

  if (!row) {
    return { ok: false, code: "invalid_token" };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetToken.delete({ where: { id: row.id } }).catch(() => {});
    return { ok: false, code: "expired" };
  }

  const nextHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: nextHash }
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } })
  ]);

  const still = await prisma.user.findUnique({ where: { id: row.userId }, select: { id: true } });
  if (!still) {
    return { ok: false, code: "user_missing" };
  }
  return { ok: true };
}
