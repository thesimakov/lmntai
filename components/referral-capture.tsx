"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { persistPendingReferralCode, referralCodeFromCurrentUrl } from "@/lib/referrals-client";

export function ReferralCapture() {
  const pathname = usePathname();

  useEffect(() => {
    const code = referralCodeFromCurrentUrl();
    if (!code) return;
    persistPendingReferralCode(code);
  }, [pathname]);

  return null;
}
