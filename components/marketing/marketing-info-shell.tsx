"use client";

import type { ReactNode } from "react";

import { MarketingSiteHeader } from "@/components/marketing/marketing-site-header";

/** Оболочка публичных информационных страниц: тот же визуальный стиль, что и у лендинга. */
export function MarketingInfoShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen font-sans text-foreground">
      <div className="landing-backdrop" aria-hidden>
        <div className="landing-backdrop__blob landing-backdrop__blob--a" />
        <div className="landing-backdrop__blob landing-backdrop__blob--b" />
        <div className="landing-backdrop__blob landing-backdrop__blob--c" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <MarketingSiteHeader />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</div>
      </div>
    </div>
  );
}
