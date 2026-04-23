"use client";

import {
  REFERRAL_COOKIE_KEY,
  REFERRAL_QUERY_PARAM,
  REFERRAL_STORAGE_KEY
} from "@/lib/referrals-constants";

export function normalizeReferralCodeClient(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toUpperCase();
  if (!v) return null;
  if (!/^[A-Z0-9_-]{4,32}$/.test(v)) return null;
  return v;
}

export function persistPendingReferralCode(raw: string | null | undefined): string | null {
  const code = normalizeReferralCodeClient(raw);
  if (!code || typeof document === "undefined") return null;
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  } catch {
    // ignore
  }
  document.cookie = `${REFERRAL_COOKIE_KEY}=${encodeURIComponent(code)}; path=/; max-age=2592000; samesite=lax`;
  return code;
}

export function readPendingReferralCode(): string | null {
  let fromStorage: string | null = null;
  try {
    fromStorage = localStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch {
    // ignore
  }
  const fromCookieMatch =
    typeof document !== "undefined"
      ? new RegExp(`(?:^|; )${REFERRAL_COOKIE_KEY}=([^;]*)`).exec(document.cookie)
      : null;
  const fromCookie = fromCookieMatch?.[1] ? decodeURIComponent(fromCookieMatch[1]) : null;
  return normalizeReferralCodeClient(fromStorage ?? fromCookie);
}

export function clearPendingReferralCode() {
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    document.cookie = `${REFERRAL_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
  }
}

export async function claimPendingReferral() {
  const code = readPendingReferralCode();
  if (!code) return;

  try {
    const res = await fetch("/api/referrals/claim", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code })
    });
    if (res.ok) {
      clearPendingReferralCode();
    }
  } catch {
    // ignore
  }
}

export function referralCodeFromCurrentUrl(): string | null {
  if (typeof window === "undefined") return null;
  const code = new URLSearchParams(window.location.search).get(REFERRAL_QUERY_PARAM);
  return normalizeReferralCodeClient(code);
}
