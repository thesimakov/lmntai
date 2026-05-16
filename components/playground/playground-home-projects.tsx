"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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

type ProjectQuota = {
  current: number;
  limit: number;
  canCreate: boolean;
};

export function PlaygroundHomeProjects({ className }: { className?: string }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [projects, setProjects] = useState<RuntimeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [quota, setQuota] = useState<ProjectQuota | null>(null);

  const selectedCount = selectedIds.size;
  const atProjectLimit = quota !== null && !quota.canCreate;
  const busyDeleting = bulkDeleting || deletingId !== null;

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
        setQuota(null);
        return;
      }
      const data = JSON.parse(text) as { projects?: RuntimeProject[]; quota?: ProjectQuota };
      setProjects(data.projects ?? []);
      setQuota(data.quota ?? null);
    } catch (e) {
      setError(t("projects_load_failed"));
      setErrorDetail(e instanceof Error ? e.message.slice(0, 600) : String(e));
      setProjects([]);
      setQuota(null);
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

  const toggleSelected = useCallback((projectId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  const deleteProjectById = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("delete failed");
    return projectId;
  }, []);

  const deleteProject = useCallback(
    async (project: RuntimeProject) => {
      const msg = t("projects_delete_confirm").replaceAll("{name}", project.name);
      if (typeof window !== "undefined" && !window.confirm(msg)) return;
      setDeletingId(project.id);
      try {
        await deleteProjectById(project.id);
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
        setQuota((prev) => {
          if (!prev) return prev;
          const current = Math.max(0, prev.current - 1);
          return { ...prev, current, canCreate: current < prev.limit };
        });
        setSelectedIds((prev) => {
          if (!prev.has(project.id)) return prev;
          const next = new Set(prev);
          next.delete(project.id);
          return next;
        });
      } catch {
        window.alert(t("projects_delete_error"));
      } finally {
        setDeletingId(null);
      }
    },
    [deleteProjectById, t]
  );

  const deleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const selectedProjects = projects.filter((p) => selectedIds.has(p.id));
    const msg =
      ids.length === 1 && selectedProjects[0]
        ? t("projects_delete_confirm").replaceAll("{name}", selectedProjects[0].name)
        : t("projects_delete_selected_confirm").replace("{count}", String(ids.length));
    if (typeof window !== "undefined" && !window.confirm(msg)) return;

    setBulkDeleting(true);
    const removed: string[] = [];
    try {
      for (const id of ids) {
        try {
          await deleteProjectById(id);
          removed.push(id);
        } catch {
          /* continue with rest */
        }
      }
      if (removed.length === 0) {
        window.alert(t("projects_delete_error"));
        return;
      }
      const removedSet = new Set(removed);
      setProjects((prev) => prev.filter((p) => !removedSet.has(p.id)));
      setQuota((prev) => {
        if (!prev) return prev;
        const current = Math.max(0, prev.current - removed.length);
        return { ...prev, current, canCreate: current < prev.limit };
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of removed) next.delete(id);
        return next;
      });
      if (removed.length < ids.length) {
        window.alert(t("projects_delete_error"));
      }
    } finally {
      setBulkDeleting(false);
    }
  }, [deleteProjectById, projects, selectedIds, t]);

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
        "mx-0 min-w-0 w-full max-w-none rounded-xl border border-slate-200/90 bg-white px-4 py-5 shadow-sm md:px-6 md:py-6",
        className
      )}
      aria-labelledby="playground-home-projects-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 id="playground-home-projects-heading" className="text-lg font-semibold tracking-tight text-slate-900">
            {t("projects_title")}
          </h2>
          {!loading && quota ? (
            <span
              className="rounded-md bg-slate-100 px-2.5 py-0.5 text-sm font-medium tabular-nums text-slate-600"
              aria-label={t("projects_quota_aria")
                .replace("{current}", String(quota.current))
                .replace("{limit}", String(quota.limit))}
            >
              {quota.current}/{quota.limit}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col items-end gap-1">
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-2.5">
            <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 gap-2 border-0 bg-primary px-3 font-semibold text-white shadow-sm hover:bg-primary/90"
            disabled={atProjectLimit}
            onClick={() => router.push("/projects/new")}
          >
            <Plus className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
            {t("projects_add")}
          </Button>
            {selectedCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5 border-rose-200/90 bg-rose-50 text-rose-700 hover:bg-rose-100/90"
                disabled={busyDeleting}
                onClick={() => void deleteSelected()}
              >
                {bulkDeleting ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4 shrink-0" aria-hidden />
                )}
                {selectedCount === 1 ? t("projects_delete") : t("projects_delete_selected")}
              </Button>
            ) : null}
          </div>
          {atProjectLimit ? (
            <Button
              asChild
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0 text-sm font-semibold text-primary"
            >
              <Link href="/pricing">{t("projects_upgrade_plan")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
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
        <ul className="mt-4 grid gap-3 sm:gap-3.5">
          {projects.map((project) => {
            const isSelected = selectedIds.has(project.id);
            return (
            <li
              key={project.id}
              className={cn(
                "flex flex-col gap-3 rounded-xl border bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:gap-4",
                isSelected
                  ? "border-primary/50 ring-2 ring-primary/20"
                  : "border-slate-200"
              )}
            >
              <label className="flex shrink-0 cursor-pointer items-start pt-0.5 sm:items-center sm:pt-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={busyDeleting}
                  onChange={() => toggleSelected(project.id)}
                  aria-label={`${t("projects_select_aria")}: ${project.name}`}
                  className="size-4 shrink-0 rounded border-slate-300 text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </label>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium text-slate-900">{project.name}</p>
                <p className="text-xs text-slate-600">
                  {t("projects_created_label")}: {formatCreatedAt(project.createdAt)}
                </p>
                <Link
                  href={project.openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{t("projects_open")}</span>
                </Link>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-slate-200 hover:bg-slate-50"
                >
                  <Link href={`/playground/cms?projectId=${encodeURIComponent(project.id)}`}>
                    <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t("projects_cms_manage")}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="gap-1.5 border-0 bg-orange-500 font-semibold text-white hover:bg-orange-600"
                >
                  <Link href={project.editUrl}>
                    <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t("projects_edit")}
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  disabled={busyDeleting}
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
            );
          })}
        </ul>
      )}
    </section>
  );
}
