import type { NextRequest } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { parseUiLanguage } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { referralCurrencyForLanguage } from "@/lib/referrals-currency";
import {
  parseTokenPackId,
  TOKEN_PACKS,
  tokenPackPriceMinor
} from "@/lib/referral-token-packs";
import {
  addReferralWalletEntry,
  decrementReferralWalletBalance
} from "@/lib/referral-wallet";
import { withApiLogging } from "@/lib/with-api-logging";

async function spendReferralWallet(req: NextRequest) {
  const session = await getSafeServerSession();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.user.demoOffline) {
    return new Response("Недоступно в демо-режиме без БД", { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as
    | { packId?: string; lang?: string }
    | null;
  const packId = parseTokenPackId(body?.packId);
  if (!packId) {
    return new Response("Unknown pack", { status: 400 });
  }

  const lang = parseUiLanguage(body?.lang) ?? "ru";
  const currency = referralCurrencyForLanguage(lang);
  const priceMinor = tokenPackPriceMinor(packId, currency);
  const pack = TOKEN_PACKS[packId];

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true }
  });
  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const debited = await decrementReferralWalletBalance(tx, user.id, currency, priceMinor);
      if (!debited) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      await tx.user.update({
        where: { id: user.id },
        data: { tokenBalance: { increment: pack.tokens } }
      });
      await addReferralWalletEntry(tx, {
        userId: user.id,
        currency,
        amountMinor: -priceMinor,
        kind: "SPEND_TOKEN_PACK",
        sourceType: "TOKEN_PACK",
        sourceId: packId,
        note: `Token pack ${packId}`
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return Response.json({ ok: false, reason: "insufficient_balance" }, { status: 400 });
    }
    throw error;
  }

  return Response.json({
    ok: true,
    packId,
    spentMinor: priceMinor,
    currency,
    addedTokens: pack.tokens
  });
}

export const POST = withApiLogging("/api/referrals/spend", spendReferralWallet);
