"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Bot, Check, FileText, Globe, LayoutTemplate, Loader2, RefreshCw, Tags } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { saveBuilderHandoff } from "@/lib/landing-handoff";
import { finalizeSubdomain, formatSubdomainDraft, isCompleteSubdomainSlug } from "@/lib/subdomain-input";
import { cn } from "@/lib/utils";

const LEMNITY_PUBLISH_SUFFIX = ".lemnity.com";

/** Временно скрывает сценарий «Через Lemnity AI», колбэк ниже оставлен для быстрого возврата. */
const NEW_PROJECT_AI_STEP_ENABLED = false;

function suggestDomainFromDisplayName(displayName: string): string {
  const draft = formatSubdomainDraft(displayName.replace(/\s+/g, "-"));
  const fin = finalizeSubdomain(draft);
  if (isCompleteSubdomainSlug(fin)) return fin;
  return `site-${Date.now().toString(36).slice(-8)}`;
}

function validateDomainInput(raw: string): boolean {
  return isCompleteSubdomainSlug(finalizeSubdomain(raw));
}

function toastProjectCreateFailure(err: unknown, genericLabel: string) {
  const raw = err instanceof Error ? err.message.trim() : "";
  const isSynthetic = raw === "" || raw === "create failed" || raw === "no project id";
  if (!isSynthetic) {
    toast.error(genericLabel, { description: raw });
  } else {
    toast.error(genericLabel);
  }
}

export type NewProjectFlowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** После успешного POST /api/projects (перед переходом в редактор). */
  onProjectCreated?: () => void;
};

export function NewProjectFlowDialog({ open, onOpenChange, onProjectCreated }: NewProjectFlowDialogProps) {
  const { t } = useI18n();
  const router = useRouter();
  const nameFieldId = useId();
  const domainFieldId = useId();

  const [step, setStep] = useState<1 | 2>(1);
  const [format, setFormat] = useState<"reusable" | "single">("reusable");
  const [displayName, setDisplayName] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [subdomainCheck, setSubdomainCheck] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");

  const trimmedName = displayName.trim();
  const trimmedDomain = finalizeSubdomain(domainInput);

  const nameValid = trimmedName.length >= 2;
  const domainValid = validateDomainInput(domainInput);
  const nameMissing = attemptedSubmit && !trimmedName;
  const nameTooShort = attemptedSubmit && trimmedName.length > 0 && !nameValid;
  const domainMissing = attemptedSubmit && !trimmedDomain;
  const domainInvalid = attemptedSubmit && trimmedDomain.length > 0 && !domainValid;
  const domainTakenBlocking = domainValid && subdomainCheck === "taken";

  const resetForm = () => {
    setStep(1);
    setFormat("reusable");
    setDisplayName("");
    setDomainInput("");
    setAttemptedSubmit(false);
    setSubdomainCheck("idle");
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) resetForm();
  };

  const onNameBlur = () => {
    if (domainInput.trim()) return;
    setDomainInput(suggestDomainFromDisplayName(displayName));
  };

  const goStep2 = () => {
    setAttemptedSubmit(true);
    if (!nameValid || !domainValid || subdomainCheck !== "available") return;
    setAttemptedSubmit(false);
    saveBuilderHandoff(trimmedName, undefined, null, {
      sitePageFormat: format,
      pageTypeApiId: trimmedDomain.replace(/-/g, "_")
    });
    setStep(2);
  };

  const persistHandoff = useCallback(() => {
    saveBuilderHandoff(trimmedName, undefined, null, {
      sitePageFormat: format,
      pageTypeApiId: trimmedDomain.replace(/-/g, "_")
    });
  }, [trimmedName, format, trimmedDomain]);

  useEffect(() => {
    if (!open) return;
    const fin = finalizeSubdomain(domainInput);
    if (!isCompleteSubdomainSlug(fin)) {
      setSubdomainCheck("idle");
      return;
    }

    let cancelled = false;
    let ac: AbortController | null = null;
    const tid = window.setTimeout(() => {
      ac = new AbortController();
      setSubdomainCheck("checking");
      void (async () => {
        try {
          const res = await fetch(`/api/projects/check-subdomain?subdomain=${encodeURIComponent(fin)}`, {
            credentials: "include",
            signal: ac!.signal
          });
          const data = (await res.json().catch(() => null)) as { available?: boolean } | null;
          if (cancelled) return;
          if (!res.ok) {
            setSubdomainCheck("error");
            return;
          }
          setSubdomainCheck(data?.available === true ? "available" : "taken");
        } catch (e) {
          if (cancelled) return;
          const name =
            typeof e === "object" && e !== null ? (Reflect.get(e, "name") as string | undefined) : undefined;
          if (e instanceof DOMException && e.name === "AbortError") return;
          if (name === "AbortError") return;
          setSubdomainCheck("error");
        }
      })();
    }, 420);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
      ac?.abort();
    };
  }, [domainInput, open]);

  const createProjectCell = useCallback(
    async (preferredEditor: "build" | "box"): Promise<string> => {
      const subdomain = trimmedDomain;

      const res = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          preferredEditor,
          subdomain
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "create failed");
      }
      const data = (await res.json().catch(() => null)) as { project?: { id?: string } } | null;
      const id = typeof data?.project?.id === "string" ? data.project.id.trim() : "";
      if (!id) {
        throw new Error("no project id");
      }
    return id;
  }, [trimmedName, trimmedDomain]);

  const goToAiPlayground = useCallback(async () => {
    if (!NEW_PROJECT_AI_STEP_ENABLED || creatingProject) return;
    setCreatingProject(true);
    try {
      const projectId = await createProjectCell("build");
      persistHandoff();
      handleOpenChange(false);
      router.push(`/playground/build?projectId=${encodeURIComponent(projectId)}`);
      onProjectCreated?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("playground-projects-refresh"));
      }
    } catch (e) {
      toastProjectCreateFailure(e, t("projects_create_failed"));
    } finally {
      setCreatingProject(false);
    }
  }, [
    creatingProject,
    createProjectCell,
    persistHandoff,
    handleOpenChange,
    router,
    onProjectCreated,
    t
  ]);

  const goToBoxEditor = useCallback(async () => {
    if (creatingProject) return;
    setCreatingProject(true);
    try {
      const projectId = await createProjectCell("box");
      persistHandoff();
      handleOpenChange(false);
      router.push(`/playground/box/editor?sandboxId=${encodeURIComponent(projectId)}`);
      onProjectCreated?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("playground-projects-refresh"));
      }
    } catch (e) {
      toastProjectCreateFailure(e, t("projects_create_failed"));
    } finally {
      setCreatingProject(false);
    }
  }, [
    creatingProject,
    createProjectCell,
    persistHandoff,
    handleOpenChange,
    router,
    onProjectCreated,
    t
  ]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-y-auto overflow-x-hidden outline-none sm:max-w-lg",
          step === 2 && "sm:max-w-md rounded-xl p-0"
        )}
      >
        {step === 1 ? (
          <>
            <DialogHeader className="space-y-1 pb-2 text-left">
              <DialogTitle className="text-xl font-semibold">{t("projects_format_modal_title")}</DialogTitle>
              <DialogDescription>{t("projects_format_modal_subtitle")}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFormat("reusable")}
                className={cn(
                  "flex flex-col items-start gap-3 rounded-xl border-2 bg-card p-4 text-left transition-colors",
                  format === "reusable"
                    ? "border-primary shadow-sm ring-1 ring-primary/20"
                    : "border-border hover:border-muted-foreground/35"
                )}
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <RefreshCw className="size-5" aria-hidden />
                </span>
                <span className="font-semibold text-foreground">{t("projects_format_reusable_title")}</span>
                <span className="text-xs leading-snug text-muted-foreground">{t("projects_format_reusable_desc")}</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("single")}
                className={cn(
                  "flex flex-col items-start gap-3 rounded-xl border-2 bg-card p-4 text-left transition-colors",
                  format === "single"
                    ? "border-primary shadow-sm ring-1 ring-primary/20"
                    : "border-border hover:border-muted-foreground/35"
                )}
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-muted text-foreground">
                  <FileText className="size-5" aria-hidden />
                </span>
                <span className="font-semibold text-foreground">{t("projects_format_single_title")}</span>
                <span className="text-xs leading-snug text-muted-foreground">{t("projects_format_single_desc")}</span>
              </button>
            </div>

            <div className="flex flex-col gap-4 py-2">
              <div className="space-y-2">
                <label htmlFor={nameFieldId} className="text-sm font-medium text-foreground">
                  {t("projects_format_name_label")} <span className="text-destructive">*</span>
                </label>
                <Input
                  id={nameFieldId}
                  value={displayName}
                  onBlur={onNameBlur}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("projects_format_name_placeholder")}
                  autoComplete="off"
                  aria-invalid={nameMissing || nameTooShort}
                  className={cn((nameMissing || nameTooShort) && "border-destructive")}
                />
                {nameTooShort ? (
                  <p className="text-xs text-muted-foreground">{t("projects_name_too_short")}</p>
                ) : null}
                {nameMissing ? (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                    {t("projects_format_field_required")}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor={domainFieldId} className="text-sm font-medium text-foreground">
                  {t("projects_format_api_id_label")} <span className="text-destructive">*</span>
                </label>
                <div
                  className={cn(
                    "flex min-h-10 w-full items-stretch overflow-hidden rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                    (domainMissing || domainInvalid || domainTakenBlocking || subdomainCheck === "error") &&
                      "border-destructive focus-within:ring-destructive"
                  )}
                >
                  <Input
                    id={domainFieldId}
                    value={domainInput}
                    onChange={(e) => setDomainInput(formatSubdomainDraft(e.target.value))}
                    onBlur={() => setDomainInput(finalizeSubdomain(domainInput))}
                    placeholder={t("projects_format_api_id_placeholder")}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={domainMissing || domainInvalid || domainTakenBlocking || subdomainCheck === "error"}
                    className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <span className="flex shrink-0 items-center border-l border-input bg-muted/40 px-3 text-xs font-medium text-muted-foreground">
                    {LEMNITY_PUBLISH_SUFFIX}
                  </span>
                </div>
                {domainMissing ? (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                    {t("projects_format_field_required")}
                  </p>
                ) : null}
                {domainInvalid ? (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                    {t("projects_format_api_id_invalid")}
                  </p>
                ) : null}
                {domainValid && subdomainCheck === "checking" ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                    {t("projects_format_subdomain_checking")}
                  </p>
                ) : null}
                {domainValid && subdomainCheck === "available" ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <Check className="size-3.5 shrink-0" aria-hidden />
                    {t("projects_format_subdomain_available")}
                  </p>
                ) : null}
                {domainValid && subdomainCheck === "taken" ? (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                    {t("projects_format_subdomain_taken")}
                  </p>
                ) : null}
                {domainValid && subdomainCheck === "error" ? (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                    {t("projects_format_subdomain_check_failed")}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="mt-4 flex-shrink-0 gap-2 sm:justify-end border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                onClick={goStep2}
                disabled={subdomainCheck === "checking"}
              >
                {t("projects_format_next")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="space-y-2 border-b border-border/70 bg-gradient-to-br from-muted/50 via-muted/20 to-transparent px-6 pb-5 pt-1 text-left">
              <DialogTitle className="text-xl font-semibold tracking-tight">{t("projects_format_step2_title")}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {t("projects_format_step2_hint").replaceAll("{name}", trimmedName)}
              </DialogDescription>
            </DialogHeader>

            <div className="relative z-10 flex flex-col gap-4 px-6 py-5">
              <Card className="gap-0 overflow-hidden py-0 shadow-sm ring-1 ring-border/60">
                <CardContent className="divide-y divide-border/80 space-y-0 p-0">
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Tags className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("projects_format_name_label")}
                      </p>
                      <p className="truncate text-sm font-medium text-foreground">{trimmedName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Globe className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("projects_format_api_id_label")}
                      </p>
                      <p className="break-all font-mono text-[13px] font-medium tabular-nums text-foreground">
                        {trimmedDomain}
                        {LEMNITY_PUBLISH_SUFFIX}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("projects_format_summary_row_format")}
                      </p>
                      <p className="text-sm font-medium leading-snug text-foreground">
                        {format === "reusable" ? t("projects_format_reusable_title") : t("projects_format_single_title")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {NEW_PROJECT_AI_STEP_ENABLED ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={creatingProject}
                  className="h-auto flex-col items-start gap-1 py-4 text-left"
                  onClick={() => void goToAiPlayground()}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Bot className="size-4 shrink-0" />
                    {t("projects_new_via_ai")}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{t("projects_new_via_ai_desc")}</span>
                </Button>
              ) : (
                <Card
                  aria-disabled
                  data-disabled
                  className="pointer-events-none gap-0 overflow-hidden border-dashed border-muted-foreground/25 bg-muted/25 py-0 opacity-95 shadow-none"
                >
                  <CardContent className="flex gap-4 p-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-inner ring-1 ring-border/60">
                      <Bot className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{t("projects_new_via_ai")}</span>
                        <Badge variant="secondary" className="font-semibold uppercase tracking-wide">
                          {t("projects_new_via_ai_soon_badge")}
                        </Badge>
                      </div>
                      <p className="text-sm leading-snug text-muted-foreground">{t("projects_new_via_ai_desc")}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card
                role="button"
                tabIndex={creatingProject ? -1 : 0}
                onClick={() => {
                  if (!creatingProject) void goToBoxEditor();
                }}
                onKeyDown={(e) => {
                  if (creatingProject || (e.key !== "Enter" && e.key !== " ")) return;
                  e.preventDefault();
                  void goToBoxEditor();
                }}
                className={cn(
                  "gap-0 overflow-hidden border-2 py-0 shadow-sm transition-[border-color,box-shadow,background]",
                  "cursor-pointer border-sky-200/90 bg-gradient-to-br from-sky-50 via-background to-violet-50/40",
                  "hover:border-sky-400/80 hover:from-sky-50/90 hover:shadow-md dark:border-sky-900/60 dark:from-sky-950/55 dark:to-violet-950/30 dark:hover:border-sky-700",
                  creatingProject && "pointer-events-none opacity-55"
                )}
              >
                <CardContent className="flex gap-4 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-50">
                    {creatingProject ? (
                      <Loader2 className="size-5 shrink-0 animate-spin text-sky-800 dark:text-sky-200" aria-hidden />
                    ) : (
                      <LayoutTemplate className="size-5" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1 self-center">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">{t("projects_new_via_box")}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                        {t("projects_format_step2_pick_box")}
                        <ArrowRight className="size-3.5" aria-hidden />
                      </span>
                    </div>
                    <p className="text-sm leading-snug text-muted-foreground">{t("projects_new_via_box_desc")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="mt-auto gap-2 border-t border-border/70 bg-muted/25 px-6 py-4 sm:justify-between">
              <Button type="button" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setStep(1)}>
                {t("projects_format_back")}
              </Button>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t("cancel")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
