"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Loader2, Rocket } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RuntimeProject = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  previewUrl: string;
};

export default function ProjectsPage() {
  const { t, lang } = useI18n();
  const [projects, setProjects] = useState<RuntimeProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const dateLocale = useMemo(() => {
    if (lang === "en") return "en-US";
    if (lang === "tg") return "tg-TJ";
    return "ru-RU";
  }, [lang]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/projects", { credentials: "include" });
        if (!res.ok) {
          throw new Error(await res.text().catch(() => t("projects_load_failed")));
        }
        const data = (await res.json()) as { projects?: RuntimeProject[] };
        if (!mounted) return;
        setProjects(data.projects ?? []);
      } catch {
        if (!mounted) return;
        setLoadError(t("projects_load_failed"));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [t]);

  function formatUpdatedAt(raw: string) {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{t("projects_title")}</h1>
            <p className="text-sm text-zinc-400">
              {projects.length} {t("projects_count")}
            </p>
          </div>
          <Button asChild>
            <Link href="/playground/build">
              <Rocket className="h-4 w-4" />
              {t("projects_new")}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-border/60 bg-card/20">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          </div>
        ) : null}

        {!isLoading && loadError ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        {!isLoading && !loadError && projects.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card/20 p-6 text-sm text-muted-foreground">
            {t("empty_projects")}
          </div>
        ) : null}

        {!isLoading && !loadError && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="transition-all hover:-translate-y-1 hover:border-white/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderKanban className="h-4 w-4 text-fuchsia-300" />
                    {project.name}
                  </CardTitle>
                  <CardDescription>{formatUpdatedAt(project.updatedAt)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                    {project.status}
                  </div>
                  <div>
                    <Button asChild size="sm" variant="secondary" className="w-full">
                      <Link href={project.previewUrl} target="_blank" rel="noreferrer">
                        {t("projects_open")}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </PageTransition>
  );
}
