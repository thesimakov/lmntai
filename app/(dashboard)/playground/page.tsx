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
      <div className="flex w-full min-w-0 flex-col gap-4">
        <HomeHero username={username} />
      </div>
    </PageTransition>
  );
}
