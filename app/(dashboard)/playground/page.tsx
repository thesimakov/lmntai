"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { HomeHero, type HomeHeroActionCategory } from "@/components/playground/home-hero";
import { PageTransition } from "@/components/page-transition";
import { saveBuilderHandoff } from "@/lib/landing-handoff";
import type { ProjectKind } from "@/lib/manus-prompt-spec";

export default function PlaygroundPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeCategory, setActiveCategory] = useState<HomeHeroActionCategory | null>(null);

  const { data: session } = useSession();

  const username = useMemo(() => {
    const displayName = session?.user?.name?.trim();
    if (displayName) return displayName;
    const emailPrefix = session?.user?.email?.split("@")[0]?.trim();
    return emailPrefix || "друг";
  }, [session?.user?.email, session?.user?.name]);

  useEffect(() => {
    try {
      const fromLanding = sessionStorage.getItem("lemnity.landing.prompt");
      if (fromLanding?.trim()) {
        setIdea(fromLanding.trim());
        sessionStorage.removeItem("lemnity.landing.prompt");
      }
    } catch {
      // ignore
    }
  }, []);

  const projectKindForHandoff: ProjectKind | undefined = activeCategory ?? undefined;

  const scrollToTemplatesPanel = useCallback(() => {
    document.getElementById("playground-templates-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  function goToBuild() {
    if (!idea.trim()) return;
    setIsGenerating(true);
    saveBuilderHandoff(idea.trim(), projectKindForHandoff);
    router.push("/playground/build");
    setTimeout(() => setIsGenerating(false), 300);
  }

  return (
    <PageTransition>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
        <HomeHero
          username={username}
          idea={idea}
          onIdeaChange={setIdea}
          onOpenTemplates={scrollToTemplatesPanel}
          onSelectTemplate={(value) => setIdea(value)}
          onSubmit={goToBuild}
          onActiveCategoryChange={setActiveCategory}
          disabled={isGenerating}
        />
      </div>
    </PageTransition>
  );
}
