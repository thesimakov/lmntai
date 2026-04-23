import { createHmac, timingSafeEqual } from "node:crypto";

import { normalizeReferralCurrency, type ReferralCurrency } from "@/lib/referrals-currency";

export type BillingWebhookPayload = {
  email: string;
  eventId: string;
  tokens: number;
  amountMinor: number | null;
  currency: ReferralCurrency | null;
  paymentId?: string;
  planId?: string;
  paidAt?: string;
  event?: string;
};

const processedEvents = globalThis.__lemnityBillingEvents ?? new Map<string, number>();
if (!globalThis.__lemnityBillingEvents) {
  globalThis.__lemnityBillingEvents = processedEvents;
}

declare global {
  // eslint-disable-next-line no-var
  var __lemnityBillingEvents: Map<string, number> | undefined;
}

const EVENT_TTL_MS = 24 * 60 * 60 * 1000;

function cleanupProcessedEvents(now = Date.now()) {
  for (const [key, ts] of processedEvents.entries()) {
    if (now - ts > EVENT_TTL_MS) {
      processedEvents.delete(key);
    }
  }
}

function parseSignature(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const value = headerValue.trim();
  if (!value) return null;
  if (value.startsWith("sha256=")) {
    return value.slice("sha256=".length);
  }
  return value;
}

export function signBillingPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyBillingSignature(body: string, signatureHeader: string | null, secret: string) {
  const actual = parseSignature(signatureHeader);
  if (!actual) return false;
  const expected = signBillingPayload(body, secret);
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(actual, "utf8");
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, actualBuf);
}

function asPositiveInt(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value <= 0 || value > 5_000_000) return null;
  return value;
}

function asNonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < 0 || value > 5_000_000) return null;
  return value;
}

function asAmountMinor(record: Record<string, unknown>): number | null {
  const amountMinor = asPositiveInt(record.amountMinor);
  if (amountMinor != null) return amountMinor;
  const amount = typeof record.amount === "number" ? record.amount : null;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  const asMinor = Math.round(amount * 100);
  if (asMinor <= 0 || asMinor > 5_000_000_000) return null;
  return asMinor;
}

export function parseBillingPayload(raw: string): BillingWebhookPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const emailRaw = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  const eventIdRaw =
    typeof record.eventId === "string"
      ? record.eventId.trim()
      : typeof record.id === "string"
        ? record.id.trim()
        : "";
  const tokens = asNonNegativeInt(record.tokens) ?? 0;
  const amountMinor = asAmountMinor(record);
  const currency = normalizeReferralCurrency(
    typeof record.currency === "string" ? record.currency : null
  );
  if (!emailRaw || !eventIdRaw) {
    return null;
  }
  if (tokens <= 0 && (!amountMinor || !currency)) {
    return null;
  }
  return {
    email: emailRaw,
    eventId: eventIdRaw,
    tokens,
    amountMinor: amountMinor ?? null,
    currency: currency ?? null,
    paymentId:
      typeof record.paymentId === "string"
        ? record.paymentId
        : typeof record.paymentIntentId === "string"
          ? record.paymentIntentId
          : undefined,
    planId:
      typeof record.planId === "string"
        ? record.planId
        : typeof record.plan === "string"
          ? record.plan
          : undefined,
    paidAt: typeof record.paidAt === "string" ? record.paidAt : undefined,
    event: typeof record.event === "string" ? record.event : undefined
  };
}

export function markBillingEventStarted(eventId: string): boolean {
  cleanupProcessedEvents();
  if (processedEvents.has(eventId)) {
    return false;
  }
  processedEvents.set(eventId, Date.now());
  return true;
}

export function markBillingEventRollback(eventId: string) {
  processedEvents.delete(eventId);
}
