import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { isNotisendApiConfigured, notisendSendRawMessage, sendWelcomeEmailAfterRegistration } from "@/lib/notisend-email";
import { isSmtpConfigured, sendSmtpEmail } from "@/lib/smtp-client";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Creates a fresh verification token for the user (one at a time). Returns the raw secret. */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  const secret = randomBytes(32).toString("hex");
  const tokenHash = hashToken(secret);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } })
  ]);

  return secret;
}

/** Sends a verification email using SMTP (dev/Mailpit) or NotiSend as fallback. */
export async function sendVerificationEmail(input: {
  email: string;
  name: string | null;
  token: string;
}): Promise<boolean> {
  const verifyUrl = `${SITE_URL}/api/auth/verify-email?token=${encodeURIComponent(input.token)}&email=${encodeURIComponent(input.email)}`;
  const displayName = input.name?.trim() || "друг";

  const subject = "Подтвердите email — Lemnity";
  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
  <h2 style="color:#1a1a1a">Подтвердите адрес электронной почты</h2>
  <p>Здравствуйте, ${escapeHtml(displayName)}!</p>
  <p>Чтобы завершить регистрацию, нажмите кнопку ниже. Ссылка действует 24 часа.</p>
  <p style="margin:32px 0">
    <a href="${escapeHtml(verifyUrl)}"
       style="background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
      Подтвердить email
    </a>
  </p>
  <p style="color:#666;font-size:13px">Или вставьте эту ссылку в браузер:<br>${escapeHtml(verifyUrl)}</p>
  <p style="color:#aaa;font-size:12px">Если вы не регистрировались на Lemnity — просто проигнорируйте это письмо.</p>
</div>`;
  const text = `Здравствуйте, ${displayName}!\n\nПодтвердите email перейдя по ссылке (действует 24 часа):\n${verifyUrl}\n\nЕсли вы не регистрировались — проигнорируйте письмо.`;

  // Prefer SMTP (Mailpit in dev, real SMTP in prod)
  if (isSmtpConfigured()) {
    const result = await sendSmtpEmail({ to: input.email, subject, html, text });
    if (!result.ok) {
      console.error("[email-verification] SMTP send failed:", result.detail);
      return false;
    }
    console.info("[email-verification] verification email sent via SMTP to", input.email);
    return true;
  }

  // Fallback: NotiSend raw message
  if (isNotisendApiConfigured()) {
    const fromEmail = process.env.NOTISEND_FROM_EMAIL?.trim() || process.env.EMAIL_FROM?.trim();
    if (!fromEmail) {
      console.warn("[email-verification] NotiSend configured but EMAIL_FROM/NOTISEND_FROM_EMAIL missing");
      return false;
    }
    const result = await notisendSendRawMessage({ to: input.email, subject, html, text });
    if (!result.ok) {
      console.error("[email-verification] NotiSend send failed:", result.detail);
      return false;
    }
    console.info("[email-verification] verification email sent via NotiSend to", input.email);
    return true;
  }

  console.warn("[email-verification] no email transport configured — skipping verification email");
  return false;
}

export type ConsumeVerificationResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "expired" | "already_verified" };

/** Validates token, marks emailVerified, cleans up. */
export async function consumeEmailVerificationToken(
  email: string,
  tokenRaw: string
): Promise<ConsumeVerificationResult> {
  const token = tokenRaw?.trim();
  if (!token || token.length < 32) {
    return { ok: false, code: "not_found" };
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, emailVerified: true }
  });
  if (!user) {
    return { ok: false, code: "not_found" };
  }
  if (user.emailVerified) {
    return { ok: false, code: "already_verified" };
  }

  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findFirst({
    where: { userId: user.id, tokenHash }
  });
  if (!record) {
    return { ok: false, code: "not_found" };
  }
  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return { ok: false, code: "expired" };
  }

  const verified = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
    select: { email: true, name: true }
  });
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

  try {
    await sendWelcomeEmailAfterRegistration({ email: verified.email, name: verified.name });
  } catch (e) {
    console.error("[email-verification] welcome email after verification failed:", e);
  }

  return { ok: true };
}
