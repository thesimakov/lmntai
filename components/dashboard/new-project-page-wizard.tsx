"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BarChart2,
  Bot,
  Check,
  ChevronDown,
  Globe,
  Palette,
  LayoutTemplate,
  Loader2,
  Presentation,
  Search,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveBuilderHandoff } from "@/lib/landing-handoff";
import { clearLemnityBoxCanvasDraft } from "@/lib/lemnity-box-editor-persistence";
import type { MessageKey } from "@/lib/i18n";
import {
  emptyProjectBrandKit,
  ProjectBrandKitFields,
  type ProjectBrandKitState
} from "@/components/dashboard/project-brand-kit-fields";
import {
  buildPlaygroundAnalyticsEditUrl,
  buildPlaygroundBuildEditUrl,
  buildPlaygroundMarketingEditUrl,
  buildPlaygroundPresentationEditUrl,
  type PreferredPlaygroundEditor
} from "@/lib/playground-project-edit-url";
import { finalizeSubdomain, formatSubdomainDraft, isCompleteSubdomainSlug } from "@/lib/subdomain-input";
import { persistBrandKitDraftToProject } from "@/lib/brand-kit-client";
import { cn } from "@/lib/utils";

const LEMNITY_PUBLISH_SUFFIX = ".lemnity.com";

type BuilderChoice = "none" | "ai" | "website" | "analytics" | "marketing";

const TEMPLATE_TAB_IDS = [
  "business",
  "store",
  "multi",
  "quiz",
  "event",
  "blog",
  "internal",
  "pro",
  "mine"
] as const;

type TemplateTabId = (typeof TEMPLATE_TAB_IDS)[number];

const TAB_I18N_KEYS = {
  business: "projects_template_tab_business",
  store: "projects_template_tab_store",
  multi: "projects_template_tab_multi",
  quiz: "projects_template_tab_quiz",
  event: "projects_template_tab_event",
  blog: "projects_template_tab_blog",
  internal: "projects_template_tab_internal",
  pro: "projects_template_tab_pro",
  mine: "projects_template_tab_mine"
} as const satisfies Record<TemplateTabId, MessageKey>;

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

export function NewProjectPageWizard() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const nameFieldId = useId();
  const domainFieldId = useId();

  const [builderChoice, setBuilderChoice] = useState<BuilderChoice>("none");
  const [activeTemplateTab, setActiveTemplateTab] = useState<TemplateTabId>("business");
  const [marketingGoal, setMarketingGoal] = useState("");
  const [marketingChannel, setMarketingChannel] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [subdomainCheck, setSubdomainCheck] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const [showBrandKit, setShowBrandKit] = useState(false);
  /** Остаётся в DOM после первого открытия — иначе Radix Select/Dialog ломают React при collapse. */
  const [brandKitMounted, setBrandKitMounted] = useState(false);
  const [brandKit, setBrandKit] = useState<ProjectBrandKitState>(emptyProjectBrandKit);
  const brandKitPendingFilesRef = useRef<Map<string, File>>(new Map());
  const [mountedBuilderPanels, setMountedBuilderPanels] = useState<Set<BuilderChoice>>(
    () => new Set()
  );

  useEffect(() => {
    setBrandKit(emptyProjectBrandKit());
    brandKitPendingFilesRef.current.clear();
  }, []);

  useEffect(() => {
    if (builderChoice === "none") return;
    setMountedBuilderPanels((prev) => {
      if (prev.has(builderChoice)) return prev;
      const next = new Set(prev);
      next.add(builderChoice);
      return next;
    });
  }, [builderChoice]);

  useEffect(() => {
    if (builderChoice === "none") return;
    const panelId = `builder-panel-${builderChoice}`;
    requestAnimationFrame(() => {
      document.getElementById(panelId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [builderChoice]);

  const trimmedName = displayName.trim();
  const trimmedDomain = finalizeSubdomain(domainInput);

  const nameValid = trimmedName.length >= 2;
  const domainValid = validateDomainInput(domainInput);
  const nameMissing = attemptedSubmit && !trimmedName;
  const nameTooShort = attemptedSubmit && trimmedName.length > 0 && !nameValid;
  const domainMissing = attemptedSubmit && !trimmedDomain;
  const domainInvalid = attemptedSubmit && trimmedDomain.length > 0 && !domainValid;
  const domainTakenBlocking = domainValid && subdomainCheck === "taken";

  const persistHandoff = useCallback(() => {
    saveBuilderHandoff(trimmedName, undefined, null, {
      sitePageFormat: "reusable",
      pageTypeApiId: trimmedDomain.replace(/-/g, "_")
    });
  }, [trimmedName, trimmedDomain]);

  useEffect(() => {
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
  }, [domainInput]);

  const createProjectCell = useCallback(
    async (preferredEditor: PreferredPlaygroundEditor): Promise<string> => {
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
      try {
        await persistBrandKitDraftToProject(id, brandKit, brandKitPendingFilesRef.current);
        brandKitPendingFilesRef.current.clear();
      } catch {
        /* не блокируем создание проекта */
      }
      return id;
    },
    [brandKit, trimmedName, trimmedDomain]
  );

  const canProceed =
    nameValid && domainValid && subdomainCheck === "available" && !creatingProject && !domainTakenBlocking;

  const websiteDisabled = creatingProject || subdomainCheck === "checking" || !canProceed;

  const navigateNewProjectToLemnityAiBuild = useCallback(
    async (_starter: "empty" | "universal" | "consultation") => {
      void _starter;
      setAttemptedSubmit(true);
      if (!nameValid || !domainValid || subdomainCheck !== "available") {
        toast.message(t("projects_template_fix_form_toast"));
        return;
      }
      if (creatingProject) return;
      setCreatingProject(true);
      try {
        const projectId = await createProjectCell("build");
        persistHandoff();
        clearLemnityBoxCanvasDraft();
        router.push(buildPlaygroundBuildEditUrl({ projectId }));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("playground-projects-refresh"));
        }
      } catch (e) {
        toastProjectCreateFailure(e, t("projects_create_failed"));
      } finally {
        setCreatingProject(false);
      }
    },
    [
      creatingProject,
      createProjectCell,
      domainValid,
      nameValid,
      persistHandoff,
      router,
      subdomainCheck,
      t
    ]
  );

  const navigateNewProjectToWebsite = useCallback(async () => {
    setAttemptedSubmit(true);
    if (!nameValid || !domainValid || subdomainCheck !== "available") {
      toast.message(t("projects_template_fix_form_toast"));
      return;
    }
    if (creatingProject) return;
    setCreatingProject(true);
    try {
      const projectId = await createProjectCell("build");
      clearLemnityBoxCanvasDraft();
      router.push(buildPlaygroundBuildEditUrl({ projectId, projectKind: "website" }));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("playground-projects-refresh"));
      }
    } catch (e) {
      toastProjectCreateFailure(e, t("projects_create_failed"));
    } finally {
      setCreatingProject(false);
    }
  }, [creatingProject, createProjectCell, domainValid, nameValid, router, subdomainCheck, t]);

  const navigateNewProjectToMarketing = useCallback(async () => {
    setAttemptedSubmit(true);
    if (!nameValid || !domainValid || subdomainCheck !== "available") {
      toast.message(t("projects_template_fix_form_toast"));
      return;
    }
    if (creatingProject) return;
    setCreatingProject(true);
    try {
      const projectId = await createProjectCell("marketing");
      router.push(
        buildPlaygroundMarketingEditUrl(projectId, {
          goal: marketingGoal,
          channel: marketingChannel,
          lang
        })
      );
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
    domainValid,
    lang,
    marketingChannel,
    marketingGoal,
    nameValid,
    router,
    subdomainCheck,
    t
  ]);

  const navigateNewProjectToPresentations = useCallback(async () => {
    setAttemptedSubmit(true);
    if (!nameValid || !domainValid || subdomainCheck !== "available") {
      toast.message(t("projects_template_fix_form_toast"));
      return;
    }
    if (creatingProject) return;
    setCreatingProject(true);
    try {
      const projectId = await createProjectCell("presentation");
      router.push(buildPlaygroundPresentationEditUrl(projectId));
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
    domainValid,
    nameValid,
    router,
    subdomainCheck,
    t
  ]);

  const navigateNewProjectToAnalytics = useCallback(async () => {
    setAttemptedSubmit(true);
    if (!nameValid || !domainValid || subdomainCheck !== "available") {
      toast.message(t("projects_template_fix_form_toast"));
      return;
    }
    if (creatingProject) return;
    setCreatingProject(true);
    try {
      const projectId = await createProjectCell("analytics");
      router.push(`${buildPlaygroundAnalyticsEditUrl(projectId)}&lang=${encodeURIComponent(lang)}`);
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
    domainValid,
    lang,
    nameValid,
    router,
    subdomainCheck,
    t
  ]);

  const onNameBlur = () => {
    if (domainInput.trim()) return;
    setDomainInput(suggestDomainFromDisplayName(displayName));
  };

  const onTabChange = (id: TemplateTabId) => {
    setActiveTemplateTab(id);
    if (id !== "business") {
      toast.message(t("projects_template_category_soon_toast"));
    }
  };

  const renderTemplates = () => {
    const nav = () => {
      void navigateNewProjectToLemnityAiBuild("empty");
    };
    const boxGate = !canProceed || creatingProject;
    const emptyDisabled = creatingProject || subdomainCheck === "checking" || boxGate;

    return (
      <>
        <header className="space-y-2 rounded-xl border border-border/60 bg-muted/25 px-4 py-4 sm:px-5 sm:py-5">
          <h2
            id="ai-page-templates-heading"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            {t("projects_new_via_ai")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("projects_new_via_ai_desc")}
          </p>
        </header>

        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border/50 bg-background/60 px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TEMPLATE_TAB_IDS.map((id) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={activeTemplateTab === id ? "default" : "ghost"}
              className={cn(
                "shrink-0 rounded-full px-3.5 text-xs font-semibold",
                activeTemplateTab === id ? "" : "text-muted-foreground"
              )}
              onClick={() => onTabChange(id)}
            >
              {t(TAB_I18N_KEYS[id])}
            </Button>
          ))}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="ml-auto shrink-0 rounded-full"
            aria-label={t("projects_template_search_aria")}
            onClick={() => toast.message(t("projects_template_search_soon_toast"))}
          >
            <Search className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-col gap-0 overflow-hidden border-border/70 py-0 shadow-md transition-shadow hover:shadow-lg">
            <CardContent className="flex flex-1 flex-col gap-4 p-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{t("projects_template_empty_title")}</h3>
                <p className="text-sm text-muted-foreground">{t("projects_template_empty_desc")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-auto w-full rounded-full font-semibold"
                disabled={emptyDisabled}
                onClick={() => nav()}
              >
                {t("projects_template_select")}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col gap-0 overflow-hidden border-border/70 py-0 shadow-md transition-shadow hover:shadow-lg">
            <CardContent className="flex flex-1 flex-col gap-4 p-4">
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500/15 via-fuchsia-500/15 to-amber-400/20">
                <div className="absolute inset-2 rounded-lg bg-background/40 blur-sm" aria-hidden />
                <span className="relative flex flex-col items-center gap-2">
                  <Sparkles className="size-12 text-sky-600 dark:text-sky-300" strokeWidth={1.25} aria-hidden />
                  <Badge className="bg-violet-600 font-bold uppercase tracking-wide text-white hover:bg-violet-600">
                    AI
                  </Badge>
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">{t("projects_template_ai_title")}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{t("projects_template_ai_desc")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-auto w-full rounded-full font-semibold"
                disabled={emptyDisabled}
                onClick={() => nav()}
              >
                {t("projects_template_generate")}
              </Button>
            </CardContent>
          </Card>

        </div>
      </>
    );
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-full px-4 py-8 pb-16 sm:px-6 lg:px-8">
      <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-sky-500/15 bg-card shadow-xl shadow-sky-500/[0.07] ring-1 ring-border/50 dark:border-sky-400/15 dark:shadow-sky-950/20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 size-[22rem] rounded-full bg-gradient-to-br from-sky-400/25 via-sky-400/5 to-transparent blur-3xl dark:from-sky-500/20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-24 size-[24rem] rounded-full bg-gradient-to-tr from-violet-500/20 via-transparent to-transparent blur-3xl dark:from-violet-600/15"
        />
        <div className="relative flex flex-col gap-10 p-6 sm:p-8 md:p-10">
          <header className="flex flex-col gap-5 border-b border-border/60 pb-0">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-2 border-border/80 bg-background/80 shadow-sm backdrop-blur-sm"
                asChild
              >
                <Link href="/projects">
                  <ArrowLeft className="size-4 shrink-0" aria-hidden />
                  {t("projects_wizard_back_projects")}
                </Link>
              </Button>
              <Badge
                variant="secondary"
                className="gap-1 border border-sky-500/20 bg-sky-500/10 font-semibold text-sky-800 shadow-sm dark:bg-sky-500/15 dark:text-sky-200"
              >
                <Sparkles className="size-3.5 opacity-90" aria-hidden />
                Lemnity
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t("projects_format_modal_title")}
              </h1>
            </div>
          </header>

          <section aria-labelledby="project-format-fields">
            <span id="project-format-fields" className="sr-only">
              {t("projects_format_modal_title")}
            </span>

            <Card className="overflow-hidden border-border/70 bg-gradient-to-b from-background/90 to-muted/20 py-0 shadow-md ring-1 ring-border/40">
              <CardContent className="flex flex-col gap-6 px-6 py-6 sm:px-8">
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
                    className={cn(
                      "h-11 border-border/80 bg-background/80 shadow-inner transition-[box-shadow,ring]",
                      "focus-visible:ring-2 focus-visible:ring-sky-500/30",
                      (nameMissing || nameTooShort) && "border-destructive"
                    )}
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
                  <label htmlFor={domainFieldId} className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Globe className="size-3.5 shrink-0 text-sky-600 opacity-80 dark:text-sky-400" aria-hidden />
                    {t("projects_format_api_id_label")} <span className="text-destructive">*</span>
                  </label>
                  <div
                    className={cn(
                      "flex min-h-11 w-full items-stretch overflow-hidden rounded-md border border-input bg-background/80 text-sm shadow-inner ring-offset-background transition-[box-shadow,ring]",
                      "focus-within:ring-2 focus-within:ring-sky-500/30 focus-within:ring-offset-2",
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
                      aria-invalid={
                        domainMissing || domainInvalid || domainTakenBlocking || subdomainCheck === "error"
                      }
                      className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <span className="flex shrink-0 items-center border-l border-input bg-sky-500/5 px-3 text-xs font-semibold text-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
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
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
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

                <div className="space-y-3 border-t border-border/60 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full justify-between border-border/80 bg-background/80 px-4 font-medium text-foreground shadow-sm"
                    aria-expanded={showBrandKit}
                    onClick={() => {
                      setShowBrandKit((open) => {
                        if (!open) setBrandKitMounted(true);
                        else if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                        return !open;
                      });
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Palette className="size-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
                      {t("projects_brand_style_toggle")}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        showBrandKit && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </Button>
                  {brandKitMounted ? (
                    <div className={cn(!showBrandKit && "hidden")} aria-hidden={!showBrandKit}>
                      <ProjectBrandKitFields
                        value={brandKit}
                        onChange={setBrandKit}
                        pendingFilesRef={brandKitPendingFilesRef}
                      />
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4" aria-labelledby="project-summary-heading">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <LayoutTemplate className="size-5" aria-hidden />
              </span>
              <div>
                <h2 id="project-summary-heading" className="text-lg font-bold tracking-tight text-foreground">
                  {t("projects_format_step2_title")}
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Card
                role="button"
                tabIndex={creatingProject ? -1 : 0}
                aria-pressed={builderChoice === "ai"}
                onClick={() => {
                  if (creatingProject) return;
                  setBuilderChoice("ai");
                }}
                onKeyDown={(e) => {
                  if (creatingProject || (e.key !== "Enter" && e.key !== " ")) return;
                  e.preventDefault();
                  setBuilderChoice("ai");
                }}
                className={cn(
                  "gap-0 overflow-hidden border-2 py-0 shadow-sm transition-[border-color,box-shadow,ring]",
                  "cursor-pointer border-violet-200/90 bg-gradient-to-br from-violet-50 via-background to-background",
                  "hover:border-violet-400/80 hover:shadow-md dark:border-violet-900/55 dark:from-violet-950/40 dark:hover:border-violet-700",
                  builderChoice === "ai" && "ring-2 ring-violet-500/35",
                  creatingProject && "pointer-events-none opacity-55"
                )}
              >
                <CardContent className="flex gap-4 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-50">
                    <Bot className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1 self-center">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      {t("projects_new_via_ai")}
                    </span>
                    <p className="text-sm font-normal leading-snug text-muted-foreground">
                      {t("projects_new_via_ai_desc")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                role="button"
                tabIndex={creatingProject ? -1 : 0}
                aria-pressed={builderChoice === "website"}
                onClick={() => {
                  if (creatingProject) return;
                  setBuilderChoice("website");
                }}
                onKeyDown={(e) => {
                  if (creatingProject || (e.key !== "Enter" && e.key !== " ")) return;
                  e.preventDefault();
                  setBuilderChoice("website");
                }}
                className={cn(
                  "gap-0 overflow-hidden border-2 py-0 shadow-sm transition-[border-color,box-shadow,ring]",
                  "cursor-pointer border-sky-200/90 bg-gradient-to-br from-sky-50 via-background to-background",
                  "hover:border-sky-400/80 hover:shadow-md dark:border-sky-900/55 dark:from-sky-950/40 dark:hover:border-sky-700",
                  builderChoice === "website" && "ring-2 ring-sky-500/35",
                  creatingProject && "pointer-events-none opacity-55"
                )}
              >
                <CardContent className="flex gap-4 p-4">
                  <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-50">
                    <Globe className="size-5" aria-hidden />
                    <Badge className="absolute -right-1 -top-1 border-0 bg-sky-600 px-1 py-0 text-[9px] font-bold uppercase text-white hover:bg-sky-600">
                      NEW
                    </Badge>
                  </span>
                  <div className="min-w-0 flex-1 space-y-1 self-center">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      Сайт (ComponentGraph)
                    </span>
                    <p className="text-sm font-normal leading-snug text-muted-foreground">
                      AI генерирует структурированный JSON-граф сайта — легко редактировать отдельные блоки.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                role="button"
                tabIndex={creatingProject ? -1 : 0}
                aria-pressed={builderChoice === "analytics"}
                onClick={() => {
                  if (creatingProject) return;
                  setBuilderChoice("analytics");
                }}
                onKeyDown={(e) => {
                  if (creatingProject || (e.key !== "Enter" && e.key !== " ")) return;
                  e.preventDefault();
                  setBuilderChoice("analytics");
                }}
                className={cn(
                  "gap-0 overflow-hidden border-2 py-0 shadow-sm transition-[border-color,box-shadow,ring]",
                  "cursor-pointer border-violet-200/90 bg-gradient-to-br from-violet-50/80 via-background to-background",
                  "hover:border-violet-400/80 hover:shadow-md dark:border-violet-900/55 dark:from-violet-950/40 dark:hover:border-violet-700",
                  builderChoice === "analytics" && "ring-2 ring-violet-500/35",
                  creatingProject && "pointer-events-none opacity-55"
                )}
              >
                <CardContent className="flex gap-4 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-50">
                    <BarChart2 className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1 self-center">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      Аналитика BI
                    </span>
                    <p className="text-sm font-normal leading-snug text-muted-foreground">
                      Загрузите PDF-отчёт — AI построит дашборд, прогноз и инвестиционную презентацию.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                role="button"
                tabIndex={creatingProject ? -1 : 0}
                aria-pressed={builderChoice === "marketing"}
                onClick={() => {
                  if (creatingProject) return;
                  setBuilderChoice("marketing");
                }}
                onKeyDown={(e) => {
                  if (creatingProject || (e.key !== "Enter" && e.key !== " ")) return;
                  e.preventDefault();
                  setBuilderChoice("marketing");
                }}
                className={cn(
                  "gap-0 overflow-hidden border-2 py-0 shadow-sm transition-[border-color,box-shadow,ring]",
                  "cursor-pointer border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-background to-background",
                  "hover:border-emerald-400/80 hover:shadow-md dark:border-emerald-900/55 dark:from-emerald-950/40 dark:hover:border-emerald-700",
                  builderChoice === "marketing" && "ring-2 ring-emerald-500/35",
                  creatingProject && "pointer-events-none opacity-55"
                )}
              >
                <CardContent className="flex gap-4 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-50">
                    <TrendingUp className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1 self-center">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      Маркетинг AI
                    </span>
                    <p className="text-sm font-normal leading-snug text-muted-foreground">
                      Анализ каналов, рекламных кампаний и аудитории. Экспорт отчёта.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                role="button"
                tabIndex={creatingProject ? -1 : 0}
                onClick={() => {
                  if (creatingProject) return;
                  void navigateNewProjectToPresentations();
                }}
                onKeyDown={(e) => {
                  if (creatingProject || (e.key !== "Enter" && e.key !== " ")) return;
                  e.preventDefault();
                  void navigateNewProjectToPresentations();
                }}
                className={cn(
                  "gap-0 overflow-hidden border-2 py-0 shadow-sm transition-[border-color,box-shadow,ring]",
                  "cursor-pointer border-fuchsia-200/90 bg-gradient-to-br from-fuchsia-50 via-background to-background",
                  "hover:border-fuchsia-400/80 hover:shadow-md dark:border-fuchsia-900/55 dark:from-fuchsia-950/40 dark:hover:border-fuchsia-700",
                  creatingProject && "pointer-events-none opacity-55"
                )}
              >
                <CardContent className="flex gap-4 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/80 dark:text-fuchsia-50">
                    <Presentation className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1 self-center">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      {t("projects_new_presentations_hub_title")}
                      {creatingProject ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                      ) : null}
                    </span>
                    <p className="text-sm font-normal leading-snug text-muted-foreground">
                      {t("projects_new_presentations_hub_desc")}
                    </p>
                  </div>
                </CardContent>
              </Card>

            </div>
          </section>

          {mountedBuilderPanels.has("ai") ? (
            <section
              className={cn(
                "space-y-5 rounded-xl border border-border/50 bg-muted/10 p-5 sm:p-6",
                builderChoice !== "ai" && "hidden"
              )}
              aria-hidden={builderChoice !== "ai"}
              aria-labelledby="ai-page-templates-heading"
            >
              {renderTemplates()}
            </section>
          ) : null}

          {mountedBuilderPanels.has("website") ? (
            <section
              className={cn(
                "space-y-5 rounded-xl border border-sky-200/60 bg-sky-50/30 p-5 dark:border-sky-800/40 dark:bg-sky-950/20 sm:p-6",
                builderChoice !== "website" && "hidden"
              )}
              aria-hidden={builderChoice !== "website"}
            >
              <header className="space-y-1">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Globe className="size-5 text-sky-600 dark:text-sky-400" aria-hidden />
                  Сайт (ComponentGraph)
                </h2>
                <p className="text-sm text-muted-foreground">
                  AI генерирует структурированный JSON-граф сайта — легко редактировать отдельные блоки.
                </p>
              </header>
              <Button
                type="button"
                disabled={websiteDisabled}
                onClick={() => void navigateNewProjectToWebsite()}
                className="w-full rounded-full border-sky-300/80 bg-sky-600 font-semibold text-white hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600 sm:w-auto sm:min-w-[200px]"
              >
                {creatingProject ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Создание...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 size-4" aria-hidden />
                    {t("projects_template_generate")}
                  </>
                )}
              </Button>
            </section>
          ) : null}

          {mountedBuilderPanels.has("analytics") ? (
            <section
              className={cn(
                "space-y-5 rounded-xl border border-violet-200/60 bg-violet-50/30 p-5 dark:border-violet-800/40 dark:bg-violet-950/20 sm:p-6",
                builderChoice !== "analytics" && "hidden"
              )}
              aria-hidden={builderChoice !== "analytics"}
            >
              <header className="space-y-1">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <BarChart2 className="size-5 text-violet-600 dark:text-violet-400" aria-hidden />
                  Аналитика BI
                </h2>
                <p className="text-sm text-muted-foreground">
                  Загрузите PDF или таблицу — AI построит финансовый дашборд, прогноз и инвестиционный отчёт.
                </p>
              </header>
              <Button
                type="button"
                disabled={!canProceed || creatingProject}
                onClick={() => void navigateNewProjectToAnalytics()}
                className="w-full rounded-full border-violet-300/80 bg-violet-600 font-semibold text-white hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600 sm:w-auto sm:min-w-[200px]"
              >
                {creatingProject ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Создание...
                  </>
                ) : (
                  <>
                    <BarChart2 className="mr-2 size-4" aria-hidden />
                    Создать BI-отчёт
                  </>
                )}
              </Button>
            </section>
          ) : null}

          {mountedBuilderPanels.has("marketing") ? (
            <section
              id="builder-panel-marketing"
              className={cn(
                "space-y-5 rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/20 sm:p-6",
                builderChoice !== "marketing" && "hidden"
              )}
              aria-hidden={builderChoice !== "marketing"}
            >
              <header className="space-y-1">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  Маркетинг AI
                </h2>
                <p className="text-sm text-muted-foreground">
                  Укажите цель и каналы — AI проанализирует данные и подготовит отчёт.
                </p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Цель кампании
                  </label>
                  <Input
                    value={marketingGoal}
                    onChange={(e) => setMarketingGoal(e.target.value)}
                    placeholder="Увеличить продажи на 30%..."
                    className="h-11 border-emerald-200/80 bg-background/80 shadow-inner focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-emerald-800/60"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Каналы продвижения
                  </label>
                  <Input
                    value={marketingChannel}
                    onChange={(e) => setMarketingChannel(e.target.value)}
                    placeholder="Instagram, VK, Google Ads..."
                    className="h-11 border-emerald-200/80 bg-background/80 shadow-inner focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-emerald-800/60"
                  />
                </div>
              </div>
              <Button
                type="button"
                disabled={!canProceed || creatingProject}
                onClick={() => void navigateNewProjectToMarketing()}
                className="w-full rounded-full border-emerald-300/80 bg-emerald-600 font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 sm:w-auto sm:min-w-[200px]"
              >
                {creatingProject ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Создание...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 size-4" aria-hidden />
                    Создать маркетинговый проект
                  </>
                )}
              </Button>
            </section>
          ) : null}

        </div>
      </div>
    </div>
  );
}
