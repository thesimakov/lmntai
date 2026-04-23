import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  normalizeReferralCurrency,
  type ReferralCurrency
} from "@/lib/referrals-currency";
import { REFERRAL_REVENUE_PERCENT } from "@/lib/referrals-constants";
import {
  addReferralWalletEntry,
  incrementReferralWalletBalance
} from "@/lib/referral-wallet";

export type ApplyReferralRevenueInput = {
  buyerId: string;
  paymentEventId: string;
  amountMinor: number;
  currency: string;
  paymentId?: string | null;
  planId?: string | null;
};

export type ApplyReferralRevenueResult =
  | { status: "applied"; referrerId: string; rewardAmountMinor: number; rewardCurrency: ReferralCurrency }
  | { status: "no_referrer" }
  | { status: "unsupported_currency" }
  | { status: "duplicate" }
  | { status: "zero_reward" };

export function calculateReferralRewardMinor(amountMinor: number): number {
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) return 0;
  return Math.floor((amountMinor * REFERRAL_REVENUE_PERCENT) / 100);
}

export async function applyReferralRevenueFromPayment(
  input: ApplyReferralRevenueInput
): Promise<ApplyReferralRevenueResult> {
  const rewardCurrency = normalizeReferralCurrency(input.currency);
  if (!rewardCurrency) {
    return { status: "unsupported_currency" };
  }

  const buyer = await prisma.user.findUnique({
    where: { id: input.buyerId },
    select: { id: true, referredById: true }
  });
  if (!buyer?.referredById) {
    return { status: "no_referrer" };
  }

  const rewardAmountMinor = calculateReferralRewardMinor(input.amountMinor);
  if (rewardAmountMinor <= 0) {
    return { status: "zero_reward" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.referralEarning.create({
        data: {
          referrerId: buyer.referredById!,
          referredUserId: buyer.id,
          paymentEventId: input.paymentEventId,
          paymentId: input.paymentId ?? null,
          planId: input.planId ?? null,
          sourceAmountMinor: input.amountMinor,
          sourceCurrency: rewardCurrency,
          rewardAmountMinor,
          rewardCurrency,
          rateUsed: 1
        }
      });

      await incrementReferralWalletBalance(tx, buyer.referredById!, rewardCurrency, rewardAmountMinor);
      await addReferralWalletEntry(tx, {
        userId: buyer.referredById!,
        currency: rewardCurrency,
        amountMinor: rewardAmountMinor,
        kind: "EARNING",
        sourceType: "PAYMENT_EVENT",
        sourceId: input.paymentEventId,
        note: `5% referral reward for ${input.paymentEventId}`
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "duplicate" };
    }
    throw error;
  }

  return {
    status: "applied",
    referrerId: buyer.referredById,
    rewardAmountMinor,
    rewardCurrency
  };
}
