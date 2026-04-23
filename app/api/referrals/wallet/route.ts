import type { NextRequest } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { parseUiLanguage } from "@/lib/i18n";
import { OFFLINE_DEMO_USER_ID } from "@/lib/offline-demo-auth";
import { prisma } from "@/lib/prisma";
import {
  convertMinorCurrency,
  formatCurrencyMinor,
  referralCurrencyForLanguage
} from "@/lib/referrals-currency";
import { walletBucketsFromRow, walletDisplayAmountMinor } from "@/lib/referral-wallet";
import { withApiLogging } from "@/lib/with-api-logging";

function localeFromLanguage(lang: "ru" | "en" | "tg"): string {
  if (lang === "en") return "en-US";
  if (lang === "tg") return "tg-TJ";
  return "ru-RU";
}

function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}***`;
  return `${maskedName}@${domain}`;
}

async function getReferralWallet(req: NextRequest) {
  const session = await getSafeServerSession();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const lang = parseUiLanguage(url.searchParams.get("lang")) ?? "ru";
  const locale = localeFromLanguage(lang);
  const displayCurrency = referralCurrencyForLanguage(lang);

  if (session.user.demoOffline) {
    return Response.json({
      userId: OFFLINE_DEMO_USER_ID,
      partner: { isPartner: false, approvedAt: null },
      wallet: {
        displayCurrency,
        availableDisplayMinor: 0,
        availableDisplayFormatted: formatCurrencyMinor(0, displayCurrency, locale),
        availableByCurrency: { RUB: 0, USD: 0, TJS: 0 }
      },
      recentEarnings: [],
      withdrawals: []
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: {
      id: true,
      isPartner: true,
      partnerApprovedAt: true
    }
  });
  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const [wallet, recentEarnings, withdrawals] = await Promise.all([
    prisma.referralWallet.findUnique({ where: { userId: user.id } }),
    prisma.referralEarning.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        rewardAmountMinor: true,
        rewardCurrency: true,
        sourceAmountMinor: true,
        sourceCurrency: true,
        createdAt: true,
        referredUser: {
          select: {
            email: true
          }
        }
      }
    }),
    prisma.withdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amountMinor: true,
        currency: true,
        status: true,
        details: true,
        createdAt: true
      }
    })
  ]);

  const availableDisplayMinor = walletDisplayAmountMinor(wallet, displayCurrency);
  const availableByCurrency = walletBucketsFromRow(wallet);

  return Response.json({
    userId: user.id,
    partner: { isPartner: user.isPartner, approvedAt: user.partnerApprovedAt },
    wallet: {
      displayCurrency,
      availableDisplayMinor,
      availableDisplayFormatted: formatCurrencyMinor(availableDisplayMinor, displayCurrency, locale),
      availableByCurrency
    },
    recentEarnings: recentEarnings.map((item) => ({
      id: item.id,
      referredUserEmail: maskEmail(item.referredUser.email),
      rewardAmountMinor: item.rewardAmountMinor,
      rewardCurrency: item.rewardCurrency,
      sourceAmountMinor: item.sourceAmountMinor,
      sourceCurrency: item.sourceCurrency,
      rewardDisplayMinor: convertMinorCurrency(
        item.rewardAmountMinor,
        item.rewardCurrency as "RUB" | "USD" | "TJS",
        displayCurrency
      ).amountMinor,
      createdAt: item.createdAt
    })),
    withdrawals: withdrawals.map((item) => ({
      ...item,
      amountDisplayMinor: convertMinorCurrency(
        item.amountMinor,
        item.currency as "RUB" | "USD" | "TJS",
        displayCurrency
      ).amountMinor
    }))
  });
}

export const GET = withApiLogging("/api/referrals/wallet", getReferralWallet);
