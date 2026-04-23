import type { Prisma, PrismaClient, ReferralWallet } from "@prisma/client";

import { convertMinorCurrency, type ReferralCurrency } from "@/lib/referrals-currency";

type TxClient = Prisma.TransactionClient | PrismaClient;

export type ReferralWalletBuckets = {
  RUB: number;
  USD: number;
  TJS: number;
};

function currencyField(currency: ReferralCurrency): keyof Pick<
  ReferralWallet,
  "availableRubMinor" | "availableUsdMinor" | "availableTjsMinor"
> {
  if (currency === "USD") return "availableUsdMinor";
  if (currency === "TJS") return "availableTjsMinor";
  return "availableRubMinor";
}

function lifetimeField(currency: ReferralCurrency): keyof Pick<
  ReferralWallet,
  "lifetimeRubMinor" | "lifetimeUsdMinor" | "lifetimeTjsMinor"
> {
  if (currency === "USD") return "lifetimeUsdMinor";
  if (currency === "TJS") return "lifetimeTjsMinor";
  return "lifetimeRubMinor";
}

export function walletBucketsFromRow(wallet: ReferralWallet | null | undefined): ReferralWalletBuckets {
  return {
    RUB: wallet?.availableRubMinor ?? 0,
    USD: wallet?.availableUsdMinor ?? 0,
    TJS: wallet?.availableTjsMinor ?? 0
  };
}

export function walletDisplayAmountMinor(
  wallet: ReferralWallet | null | undefined,
  targetCurrency: ReferralCurrency
): number {
  const buckets = walletBucketsFromRow(wallet);
  return (
    convertMinorCurrency(buckets.RUB, "RUB", targetCurrency).amountMinor +
    convertMinorCurrency(buckets.USD, "USD", targetCurrency).amountMinor +
    convertMinorCurrency(buckets.TJS, "TJS", targetCurrency).amountMinor
  );
}

export async function ensureReferralWallet(client: TxClient, userId: string) {
  return client.referralWallet.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
}

export async function incrementReferralWalletBalance(
  client: TxClient,
  userId: string,
  currency: ReferralCurrency,
  amountMinor: number
) {
  if (amountMinor <= 0) return ensureReferralWallet(client, userId);
  const available = currencyField(currency);
  const lifetime = lifetimeField(currency);
  return client.referralWallet.upsert({
    where: { userId },
    update: {
      [available]: { increment: amountMinor },
      [lifetime]: { increment: amountMinor }
    } as Prisma.ReferralWalletUncheckedUpdateInput,
    create: {
      userId,
      [available]: amountMinor,
      [lifetime]: amountMinor
    } as Prisma.ReferralWalletUncheckedCreateInput
  });
}

export async function decrementReferralWalletBalance(
  client: TxClient,
  userId: string,
  currency: ReferralCurrency,
  amountMinor: number
) {
  if (amountMinor <= 0) return false;
  await ensureReferralWallet(client, userId);
  const available = currencyField(currency);
  const result = await client.referralWallet.updateMany({
    where: { userId, [available]: { gte: amountMinor } },
    data: {
      [available]: { decrement: amountMinor }
    } as Prisma.ReferralWalletUpdateManyMutationInput
  });
  return result.count > 0;
}

export async function addReferralWalletEntry(
  client: TxClient,
  input: {
    userId: string;
    currency: ReferralCurrency;
    amountMinor: number;
    kind: string;
    sourceType?: string;
    sourceId?: string;
    note?: string;
  }
) {
  return client.referralWalletEntry.create({
    data: {
      userId: input.userId,
      currency: input.currency,
      amountMinor: input.amountMinor,
      kind: input.kind,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      note: input.note
    }
  });
}

export function canRequestWithdrawal(isPartner: boolean) {
  return isPartner;
}
