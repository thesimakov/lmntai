"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Frame, Loader2, Pencil, Rocket, Sparkles, Trash2 } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RuntimeProject = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  embedUrl: string | null;
  editUrl: string;
  openUrl: string;
};

export default function ProjectsPage() {
  const { t, lang } = useI18n();
  const [projects, setProjects] = useState<RuntimeProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const deleteProject = useCallback(
    async (project: RuntimeProject) => {
      const msg = t("projects_delete_confirm").replaceAll("{name}", project.name);
      if (typeof window !== "undefined" && !window.confirm(msg)) return;
      setDeletingId(project.id);
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
          method: "DELETE",
          credentials: "include"
        });
        if (!res.ok) {
          throw new Error("delete failed");
        }
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
      } catch {
        window.alert(t("projects_delete_error"));
      } finally {
        setDeletingId(null);
      }
    },
    [t]
  );

  function formatCreatedAt(raw: string) {
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
            <p className="text-sm text-muted-foreground">
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className={cn(
                  "overflow-hidden border-border/80 p-0 shadow-sm transition-all",
                  "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                )}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted/50">
                  {project.embedUrl ? (
                    <iframe
                      title={project.name}
                      src={project.embedUrl}
                      className="pointer-events-none h-full min-h-[140px] w-full border-0 bg-background select-none"
                      sandbox="allow-scripts allow-same-origin"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
                      <Frame className="h-10 w-10 opacity-40" strokeWidth={1.25} />
                      <span className="text-xs">{t("projects_preview_placeholder")}</span>
                    </div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
                    aria-hidden
                  />
                </div>

                <CardContent className="space-y-3 p-4 pt-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <h2 className="line-clamp-2 min-h-[2.5rem] text-base font-semibold leading-snug text-foreground">
                      {project.name}
                    </h2>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("projects_created_label")}: {formatCreatedAt(project.createdAt)}
                  </p>

                  <div className="flex gap-2 pt-1">
                    <Button asChild size="sm" className="min-w-0 flex-1 gap-1.5">
                      <Link href={project.editUrl}>
                        <Pencil className="h-3.5 w-3.5" />
                        {t("projects_edit")}
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary" className="min-w-0 flex-1">
                      <Link href={project.openUrl} target="_blank" rel="noreferrer">
                        {t("projects_go")}
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={deletingId === project.id}
                      onClick={() => void deleteProject(project)}
                      aria-label={t("projects_delete_aria")}
                    >
                      {deletingId === project.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
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
