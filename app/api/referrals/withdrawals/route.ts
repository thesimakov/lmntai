import type { NextRequest } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { parseUiLanguage } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  normalizeReferralCurrency,
  referralCurrencyForLanguage
} from "@/lib/referrals-currency";
import { REFERRAL_WITHDRAWAL_MIN_MINOR } from "@/lib/referrals-constants";
import {
  addReferralWalletEntry,
  canRequestWithdrawal,
  decrementReferralWalletBalance
} from "@/lib/referral-wallet";
import { withApiLogging } from "@/lib/with-api-logging";

function parseAmountMinor(payload: { amountMinor?: unknown; amount?: unknown }): number | null {
  if (typeof payload.amountMinor === "number" && Number.isInteger(payload.amountMinor) && payload.amountMinor > 0) {
    return payload.amountMinor;
  }
  if (typeof payload.amount === "number" && Number.isFinite(payload.amount) && payload.amount > 0) {
    const minor = Math.round(payload.amount * 100);
    return minor > 0 ? minor : null;
  }
  return null;
}

async function createWithdrawal(req: NextRequest) {
  const session = await getSafeServerSession();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.user.demoOffline) {
    return new Response("Недоступно в демо-режиме без БД", { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        amountMinor?: unknown;
        amount?: unknown;
        currency?: unknown;
        details?: unknown;
        lang?: unknown;
      }
    | null;

  const lang = parseUiLanguage(typeof body?.lang === "string" ? body.lang : null) ?? "ru";
  const currency =
    normalizeReferralCurrency(typeof body?.currency === "string" ? body.currency : null) ??
    referralCurrencyForLanguage(lang);
  const amountMinor = parseAmountMinor({ amountMinor: body?.amountMinor, amount: body?.amount });
  const details = typeof body?.details === "string" ? body.details.trim() : "";

  if (!amountMinor || amountMinor < REFERRAL_WITHDRAWAL_MIN_MINOR) {
    return new Response("Amount is below minimum threshold", { status: 400 });
  }
  if (details.length > 2_000) {
    return new Response("Details are too long", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, isPartner: true }
  });
  if (!user) {
    return new Response("User not found", { status: 404 });
  }
  if (!canRequestWithdrawal(user.isPartner)) {
    return Response.json(
      {
        ok: false,
        reason: "partner_required",
        message: "Для вывода подпишите эксклюзивное партнёрство с Lemnity"
      },
      { status: 403 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const debited = await decrementReferralWalletBalance(tx, user.id, currency, amountMinor);
      if (!debited) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      const request = await tx.withdrawalRequest.create({
        data: {
          userId: user.id,
          amountMinor,
          currency,
          status: "PENDING",
          details: details || null
        }
      });
      await addReferralWalletEntry(tx, {
        userId: user.id,
        currency,
        amountMinor: -amountMinor,
        kind: "WITHDRAWAL_REQUEST",
        sourceType: "WITHDRAWAL_REQUEST",
        sourceId: request.id,
        note: details || "Withdrawal request"
      });
      return request;
    });

    return Response.json({ ok: true, request: result });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return new Response("Insufficient referral wallet balance", { status: 400 });
    }
    throw error;
  }
}

export const POST = withApiLogging("/api/referrals/withdrawals", createWithdrawal);
