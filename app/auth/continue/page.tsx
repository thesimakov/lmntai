"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { resolvePostAuthRedirect } from "@/lib/post-login-redirect";
import { claimPendingReferral } from "@/lib/referrals-client";

function AuthContinueInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  useEffect(() => {
    (async () => {
      await claimPendingReferral();
      const dest = resolvePostAuthRedirect(next);
      router.replace(dest);
    })();
  }, [next, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Перенаправление…
    </div>
  );
}

export default function AuthContinuePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Загрузка…
        </div>
      }
    >
      <AuthContinueInner />
    </Suspense>
  );
}
