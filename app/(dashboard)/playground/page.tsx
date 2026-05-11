"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";

import { HomeHero } from "@/components/playground/home-hero";
import { PageTransition } from "@/components/page-transition";

export default function PlaygroundPage() {
  const { data: session } = useSession();

  const username = useMemo(() => {
    const displayName = session?.user?.name?.trim();
    if (displayName) return displayName;
    const emailPrefix = session?.user?.email?.split("@")[0]?.trim();
    return emailPrefix || "друг";
  }, [session?.user?.email, session?.user?.name]);

  return (
    <PageTransition>
      <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-[#f4f7fb] px-4 py-6 shadow-sm md:rounded-3xl md:px-7 md:py-8">
        <HomeHero username={username} />
      </div>
    </PageTransition>
  );
}
