"use client";

import { PlaygroundHomeProjects } from "@/components/playground/playground-home-projects";
import { useI18n } from "@/components/i18n-provider";

export type HomeHeroActionCategory =
  | "presentation"
  | "website"
  | "resume"
  | "design"
  | "visitcard"
  | "lovable";

type HomeHeroProps = {
  username: string;
};

export function HomeHero({ username }: HomeHeroProps) {
  const { t } = useI18n();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="mt-5 shrink-0 space-y-6">
        <header className="mx-auto w-full max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-normal tracking-tight text-foreground md:text-5xl">
            {t("playground_home_title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("playground_home_greeting")}{" "}
            <span className="text-foreground/90">{username}</span>
          </p>
        </header>

        <PlaygroundHomeProjects />
      </div>
    </div>
  );
}
