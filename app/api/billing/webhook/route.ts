import type { NextRequest } from "next/server";

import {
  markBillingEventRollback,
  markBillingEventStarted,
  parseBillingPayload,
  verifyBillingSignature
} from "@/lib/billing-webhook";
import { prisma } from "@/lib/prisma";
import { applyReferralRevenueFromPayment } from "@/lib/referral-revenue";
import { SHARE_BRANDING_REMOVAL_PLAN_ID } from "@/lib/share-branding";
import { withApiLogging } from "@/lib/with-api-logging";

async function postBillingWebhook(req: NextRequest) {
  const secret = process.env.BILLING_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Billing webhook is not configured", { status: 503 });
  }

  const raw = await req.text().catch(() => "");
  if (!raw) {
    return new Response("Empty body", { status: 400 });
  }

  const signature = req.headers.get("x-lemnity-signature");
  const signatureOk = verifyBillingSignature(raw, signature, secret);
  if (!signatureOk) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = parseBillingPayload(raw);
  if (!payload) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (!markBillingEventStarted(payload.eventId)) {
    return Response.json({ ok: true, duplicate: true });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      markBillingEventRollback(payload.eventId);
      return new Response("User not found", { status: 404 });
    }

    if (payload.tokens > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tokenBalance: { increment: payload.tokens } }
      });
    }

    const planTag = (payload.planId ?? "").trim().toUpperCase();
    if (planTag === SHARE_BRANDING_REMOVAL_PLAN_ID) {
      await prisma.user.update({
        where: { id: user.id },
        data: { shareBrandingRemovalPaidAt: new Date() }
      });
    }

    const referralResult =
      payload.amountMinor && payload.currency
        ? await applyReferralRevenueFromPayment({
            buyerId: user.id,
            paymentEventId: payload.eventId,
            amountMinor: payload.amountMinor,
            currency: payload.currency,
            paymentId: payload.paymentId,
            planId: payload.planId
          })
        : { status: "skipped_no_amount" as const };

    return Response.json({
      ok: true,
      eventId: payload.eventId,
      appliedTokens: payload.tokens,
      referral: referralResult
    });
  } catch {
    markBillingEventRollback(payload.eventId);
    throw new Error("Failed to process billing webhook");
  }
}

export const POST = withApiLogging("/api/billing/webhook", postBillingWebhook);

