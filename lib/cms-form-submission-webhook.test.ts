import { describe, expect, it } from "vitest";

import { normalizeFormSubmissionWebhookUrl } from "@/lib/cms-form-submission-webhook";

describe("normalizeFormSubmissionWebhookUrl", () => {
  it("accepts https URLs", () => {
    expect(normalizeFormSubmissionWebhookUrl("  https://hooks.zapier.com/hooks/catch/abc/xyz  ")).toBe(
      "https://hooks.zapier.com/hooks/catch/abc/xyz",
    );
  });

  it("rejects empty, http, localhost", () => {
    expect(normalizeFormSubmissionWebhookUrl("")).toBeNull();
    expect(normalizeFormSubmissionWebhookUrl(null)).toBeNull();
    expect(normalizeFormSubmissionWebhookUrl("http://evil.com")).toBeNull();
    expect(normalizeFormSubmissionWebhookUrl("https://localhost/hook")).toBeNull();
  });
});
