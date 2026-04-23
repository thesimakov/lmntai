import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { REFERRAL_BONUS_TOKENS } from "@/lib/referrals-constants";

const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 8;

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toUpperCase();
  if (!v) return null;
  if (!/^[A-Z0-9_-]{4,32}$/.test(v)) return null;
  return v;
}

function randomReferralCode(): string {
  const bytes = randomBytes(REFERRAL_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    out += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length];
  }
  return out;
}

export async function ensureUserReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true }
  });
  if (!existing) {
    throw new Error("User not found");
  }
  if (existing.referralCode) {
    return existing.referralCode;
  }

  for (let i = 0; i < 10; i += 1) {
    const candidate = randomReferralCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: candidate },
        select: { referralCode: true }
      });
      if (updated.referralCode) return updated.referralCode;
    } catch (error) {
      // P2002: unique constraint failed (collision); retry.
      const maybe = error as { code?: string };
      if (maybe?.code !== "P2002") {
        throw error;
      }
    }
  }

  throw new Error("Failed to allocate unique referral code");
}

export type ClaimReferralResult =
  | { status: "claimed"; referrerId: string; bonus: number }
  | { status: "invalid_code" }
  | { status: "self_referral" }
  | { status: "already_claimed" };

export async function claimReferralForUser(
  userId: string,
  rawReferralCode: string | null | undefined
): Promise<ClaimReferralResult> {
  const referralCode = normalizeReferralCode(rawReferralCode);
  if (!referralCode) {
    return { status: "invalid_code" };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referredById: true, referralCode: true }
  });
  if (!currentUser) {
    return { status: "invalid_code" };
  }
  if (currentUser.referredById) {
    return { status: "already_claimed" };
  }
  if (currentUser.referralCode === referralCode) {
    return { status: "self_referral" };
  }

  const referrer = await prisma.user.findUnique({
    where: { referralCode },
    select: { id: true }
  });
  if (!referrer) {
    return { status: "invalid_code" };
  }
  if (referrer.id === currentUser.id) {
    return { status: "self_referral" };
  }

  return prisma.$transaction(async (tx) => {
    const linked = await tx.user.updateMany({
      where: { id: currentUser.id, referredById: null },
      data: { referredById: referrer.id }
    });
    if (linked.count === 0) {
      return { status: "already_claimed" as const };
    }
    await tx.user.update({
      where: { id: referrer.id },
      data: {
        tokenBalance: { increment: REFERRAL_BONUS_TOKENS }
      }
    });
    return {
      status: "claimed" as const,
      referrerId: referrer.id,
      bonus: REFERRAL_BONUS_TOKENS
    };
  });
}
