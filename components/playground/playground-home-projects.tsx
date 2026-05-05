"use client";

import Link from "next/link";
import { ExternalLink, LayoutGrid, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { NewProjectFlowDialog } from "@/components/dashboard/new-project-flow-dialog";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RuntimeProject = {
  id: string;
  name: string;
  createdAt: string;
  editUrl: string;
  openUrl: string;
};

export function PlaygroundHomeProjects({ className }: { className?: string }) {
  const { t, lang } = useI18n();
  const [projects, setProjects] = useState<RuntimeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorDetail(null);
    try {
      const res = await fetch("/api/projects", { credentials: "include", cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        setError(t("projects_load_failed"));
        let detail = text.trim().slice(0, 800) || null;
        try {
          const j = JSON.parse(text) as { error?: string };
          if (typeof j.error === "string" && j.error.trim().length > 0) {
            detail = j.error.trim().slice(0, 1200);
          }
        } catch {
          /* plain-text body */
        }
        setErrorDetail(detail);
        setProjects([]);
        return;
      }
      const data = JSON.parse(text) as { projects?: RuntimeProject[] };
      setProjects(data.projects ?? []);
    } catch (e) {
      setError(t("projects_load_failed"));
      setErrorDetail(e instanceof Error ? e.message.slice(0, 600) : String(e));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const onRefresh = () => {
      void loadProjects();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("playground-projects-refresh", onRefresh);
      return () => window.removeEventListener("playground-projects-refresh", onRefresh);
    }
    return undefined;
  }, [loadProjects]);

  const dateLocale = useMemo(() => {
    if (lang === "en") return "en-US";
    if (lang === "tg") return "tg-TJ";
    return "ru-RU";
  }, [lang]);

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
        if (!res.ok) throw new Error("delete failed");
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
    <section
      className={cn(
        "mx-0 min-w-0 w-full max-w-none rounded-none bg-muted/15 px-4 py-4 md:px-5 md:py-5",
        className
      )}
      aria-labelledby="playground-home-projects-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 gap-y-3">
        <h2 id="playground-home-projects-heading" className="text-lg font-semibold tracking-tight text-foreground">
          {t("projects_title")}
        </h2>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-2.5">
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 gap-2 px-3 font-semibold shadow-sm"
            onClick={() => setNewProjectOpen(true)}
          >
            <Plus className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
            {t("projects_add")}
          </Button>
          <Button variant="secondary" size="sm" className="h-9 shrink-0 gap-2 border border-border px-3 font-semibold shadow-sm" asChild>
            <Link href="/playground/cms">
              <LayoutGrid className="size-4 shrink-0" aria-hidden />
              {t("playground_home_open_cms")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-9 shrink-0 text-muted-foreground" asChild>
            <Link href="/projects">{t("projects_more")}</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
          {t("loading")}
        </div>
      ) : error ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          {errorDetail ? (
            <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{errorDetail}</p>
          ) : null}
        </div>
      ) : projects.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("empty_projects")}</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:gap-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex flex-col gap-3 rounded-xl border border-border/80 bg-background/80 p-3 sm:flex-row sm:items-center sm:gap-4 dark:bg-background/40"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium text-foreground">{project.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("projects_created_label")}: {formatCreatedAt(project.createdAt)}
                </p>
                <Link
                  href={project.openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{t("projects_open")}</span>
                </Link>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <Button asChild size="sm" variant="secondary" className="gap-1.5">
                  <Link href={project.editUrl}>
                    <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t("projects_edit")}
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={deletingId === project.id}
                  aria-label={t("projects_delete_aria")}
                  onClick={() => void deleteProject(project)}
                >
                  {deletingId === project.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <NewProjectFlowDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onProjectCreated={() => void loadProjects()}
      />
    </section>
  );
}
