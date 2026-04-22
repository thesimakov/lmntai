"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { HomeHero } from "@/components/playground/home-hero";
import { PageTransition } from "@/components/page-transition";

export default function PlaygroundPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  const username = useMemo(() => {
    // достаём через /api/profile, но пока показываем friendly fallback
    return "друг";
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = (await res.json()) as { user: { tokenBalance: number; name?: string | null } };
      setTokenBalance(data.user.tokenBalance);
    })();
  }, []);

  function goToBuild() {
    if (!idea.trim()) return;
    setIsGenerating(true);
    try {
      localStorage.setItem("lemnity.builder", JSON.stringify({ idea: idea.trim() }));
    } catch {
      // ignore
    }
    router.push("/playground/build");
    setTimeout(() => setIsGenerating(false), 300);
  }

  return (
    <PageTransition>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <HomeHero
          username={username}
          idea={idea}
          onIdeaChange={setIdea}
          tokenBalance={tokenBalance}
          onOpenTemplates={() => {}}
          onSelectTemplate={(value) => setIdea(value)}
          onSubmit={goToBuild}
          disabled={isGenerating}
        />
      </div>
    </PageTransition>
  );
}
