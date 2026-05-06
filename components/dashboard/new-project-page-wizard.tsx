"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Globe,
  LayoutTemplate,
  Loader2,
  Search,
  Sparkles
} from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveBuilderHandoff } from "@/lib/landing-handoff";
import { clearLemnityBoxCanvasDraft } from "@/lib/lemnity-box-editor-persistence";
import type { MessageKey } from "@/lib/i18n";
import { finalizeSubdomain, formatSubdomainDraft, isCompleteSubdomainSlug } from "@/lib/subdomain-input";
import { cn } from "@/lib/utils";

const LEMNITY_PUBLISH_SUFFIX = ".lemnity.com";

const NEW_PROJECT_AI_STEP_ENABLED = false;

type BuilderChoice = "none" | "ai" | "box";

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
  const { t } = useI18n();
  const router = useRouter();
  const nameFieldId = useId();
  const domainFieldId = useId();

  const [builderChoice, setBuilderChoice] = useState<BuilderChoice>("none");
  const [activeTemplateTab, setActiveTemplateTab] = useState<TemplateTabId>("business");
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

  const createProjectCell = useCallback(async (): Promise<string> => {
    const subdomain = trimmedDomain;

    const res = await fetch("/api/projects", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmedName,
        preferredEditor: "box",
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

  const canProceed =
    nameValid && domainValid && subdomainCheck === "available" && !creatingProject && !domainTakenBlocking;

  const navigateNewProjectToEditor = useCallback(
    async (starter: "empty" | "universal" | "consultation") => {
      setAttemptedSubmit(true);
      if (!nameValid || !domainValid || subdomainCheck !== "available") {
        toast.message(t("projects_template_fix_form_toast"));
        return;
      }
      if (creatingProject) return;
      setCreatingProject(true);
      try {
        const projectId = await createProjectCell();
        persistHandoff();
        clearLemnityBoxCanvasDraft();
        router.push(
          `/playground/box/editor?sandboxId=${encodeURIComponent(projectId)}&boxStarter=${encodeURIComponent(starter)}`
        );
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

  const renderTemplates = (variant: "box" | "ai") => {
    const isAi = variant === "ai";
    const toastAi = () => toast.message(t("projects_template_ai_soon_toast"));
    const nav = (starter: "empty" | "universal" | "consultation") => {
      if (isAi) {
        toastAi();
        return;
      }
      void navigateNewProjectToEditor(starter);
    };
    const boxGate = !canProceed || creatingProject;
    const emptyDisabled = creatingProject || subdomainCheck === "checking" || (!isAi && boxGate);
    const pairDisabled = creatingProject || subdomainCheck === "checking" || (!isAi && boxGate);

    return (
      <>
        <header className="space-y-2 rounded-xl border border-border/60 bg-muted/25 px-4 py-4 sm:px-5 sm:py-5">
          <h2
            id={isAi ? "ai-page-templates-heading" : "new-page-templates-heading"}
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            {isAi ? t("projects_new_via_ai") : t("projects_new_page_title")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isAi ? t("projects_new_via_ai_desc") : t("projects_new_page_subtitle")}
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
                onClick={() => nav("empty")}
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
                  <Badge variant="secondary" className="font-semibold uppercase tracking-wide">
                    {t("projects_new_via_ai_soon_badge")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t("projects_template_ai_desc")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-auto w-full rounded-full font-semibold"
                disabled
                aria-disabled
              >
                {t("projects_template_generate")}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col gap-0 overflow-hidden border-border/70 py-0 shadow-md transition-shadow hover:shadow-lg">
            <CardContent className="flex flex-1 flex-col gap-4 p-4">
              <div
                className="flex aspect-[4/3] flex-col justify-end rounded-xl bg-cover bg-center p-4 text-white shadow-inner ring-1 ring-border/40"
                style={{
                  backgroundImage:
                    "linear-gradient(to top, rgba(15,23,42,0.82), rgba(15,23,42,0.2)), url(https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=70)"
                }}
              >
                <p className="text-lg font-semibold drop-shadow-sm">{t("projects_template_universal_preview_title")}</p>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{t("projects_template_universal_title")}</h3>
                <p className="text-sm text-muted-foreground">{t("projects_template_universal_desc")}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[120px] flex-1 rounded-full font-semibold"
                  disabled={pairDisabled}
                  onClick={() => nav("universal")}
                >
                  {t("projects_template_select")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[120px] flex-1 rounded-full font-semibold"
                  disabled={creatingProject}
                  onClick={() => toast.message(t("projects_template_preview_soon_toast"))}
                >
                  {t("projects_template_view")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col gap-0 overflow-hidden border-border/70 py-0 shadow-md transition-shadow hover:shadow-lg">
            <CardContent className="flex flex-1 flex-col gap-4 p-4">
              <div
                className="flex aspect-[4/3] flex-col justify-end rounded-xl bg-cover bg-center p-4 text-white shadow-inner ring-1 ring-border/40"
                style={{
                  backgroundImage:
                    "linear-gradient(to top, rgba(30,58,95,0.88), rgba(30,58,95,0.25)), url(https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=70)",
                }}
              >
                <p className="text-lg font-semibold drop-shadow-sm">{t("projects_template_consultation_preview_title")}</p>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{t("projects_template_consultation_title")}</h3>
                <p className="text-sm text-muted-foreground">{t("projects_template_consultation_desc")}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[120px] flex-1 rounded-full font-semibold"
                  disabled={pairDisabled}
                  onClick={() => nav("consultation")}
                >
                  {t("projects_template_select")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[120px] flex-1 rounded-full font-semibold"
                  disabled={creatingProject}
                  onClick={() => toast.message(t("projects_template_preview_soon_toast"))}
                >
                  {t("projects_template_view")}
                </Button>
              </div>
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
              <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                {t("projects_new_page_subtitle")}
              </p>
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
              {NEW_PROJECT_AI_STEP_ENABLED ? (
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
              ) : (
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
                    "gap-0 overflow-hidden border-2 py-0 shadow-none transition-[border-color,box-shadow,ring]",
                    "cursor-pointer border-dashed border-muted-foreground/30 bg-muted/25",
                    "hover:border-muted-foreground/50 hover:bg-muted/35",
                    builderChoice === "ai" &&
                      "border-violet-500/70 bg-violet-50/40 ring-2 ring-violet-500/25 dark:bg-violet-950/25",
                    creatingProject && "pointer-events-none opacity-55"
                  )}
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
                aria-pressed={builderChoice === "box"}
                onClick={() => {
                  if (creatingProject) return;
                  setBuilderChoice("box");
                }}
                onKeyDown={(e) => {
                  if (creatingProject || (e.key !== "Enter" && e.key !== " ")) return;
                  e.preventDefault();
                  setBuilderChoice("box");
                }}
                className={cn(
                  "gap-0 overflow-hidden border-2 py-0 shadow-md transition-[border-color,box-shadow,background,ring]",
                  "cursor-pointer border-sky-200/90 bg-gradient-to-br from-sky-50 via-background to-violet-50/40",
                  "hover:border-sky-400/80 hover:from-sky-50/90 hover:shadow-lg dark:border-sky-900/60 dark:from-sky-950/55 dark:to-violet-950/30 dark:hover:border-sky-700",
                  builderChoice === "box" && "ring-2 ring-sky-500/45 shadow-sky-500/10",
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
                    {!canProceed ? (
                      <p className="text-xs text-muted-foreground">{t("projects_template_box_card_hint")}</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {builderChoice === "box" ? (
            <section
              className="space-y-5 rounded-xl border border-border/50 bg-muted/10 p-5 sm:p-6"
              aria-labelledby="new-page-templates-heading"
            >
              {renderTemplates("box")}
            </section>
          ) : builderChoice === "ai" ? (
            <section
              className="space-y-5 rounded-xl border border-border/50 bg-muted/10 p-5 sm:p-6"
              aria-labelledby="ai-page-templates-heading"
            >
              {renderTemplates("ai")}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
