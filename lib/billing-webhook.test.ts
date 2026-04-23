import { describe, expect, it } from "vitest";

import { parseBillingPayload, signBillingPayload, verifyBillingSignature } from "@/lib/billing-webhook";

describe("billing webhook helpers", () => {
  it("parses valid payload", () => {
    const payload = parseBillingPayload(
      JSON.stringify({
        eventId: "evt_123",
        email: "USER@example.com",
        tokens: 2500,
        amountMinor: 19900,
        currency: "rub",
        paymentId: "pay_1",
        planId: "PRO"
      })
    );
    expect(payload).toEqual({
      eventId: "evt_123",
      email: "user@example.com",
      tokens: 2500,
      amountMinor: 19900,
      currency: "RUB",
      paymentId: "pay_1",
      planId: "PRO",
      paidAt: undefined,
      event: undefined
    });
  });

  it("rejects invalid payload", () => {
    const payload = parseBillingPayload(
      JSON.stringify({
        eventId: "evt_123",
        email: "user@example.com",
        tokens: -10
      })
    );
    expect(payload).toBeNull();
  });

  it("accepts events with only monetary fields", () => {
    const payload = parseBillingPayload(
      JSON.stringify({
        eventId: "evt_money",
        email: "user@example.com",
        amount: 49.9,
        currency: "USD"
      })
    );
    expect(payload).toEqual({
      eventId: "evt_money",
      email: "user@example.com",
      tokens: 0,
      amountMinor: 4990,
      currency: "USD",
      paymentId: undefined,
      planId: undefined,
      paidAt: undefined,
      event: undefined
    });
  });

  it("verifies hmac signature", () => {
    const body = JSON.stringify({ eventId: "evt_1", email: "a@b.c", tokens: 1 });
    const secret = "super-secret";
    const signature = signBillingPayload(body, secret);
    const valid = verifyBillingSignature(body, `sha256=${signature}`, secret);
    const invalid = verifyBillingSignature(body, "sha256=bad", secret);
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });
});
