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
  Sparkles,
  Tags
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

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-10 px-4 py-8 pb-16 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" className="gap-2 text-muted-foreground" asChild>
          <Link href="/projects">
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            {t("projects_wizard_back_projects")}
          </Link>
        </Button>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("projects_format_modal_title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("projects_format_modal_subtitle")}</p>
      </header>

      <section className="space-y-6" aria-labelledby="project-format-fields">
        <span id="project-format-fields" className="sr-only">
          {t("projects_format_modal_title")}
        </span>

        <div className="flex flex-col gap-4">
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
      </section>

      <section className="space-y-4" aria-labelledby="project-summary-heading">
        <h2 id="project-summary-heading" className="sr-only">
          {t("projects_format_step2_title")}
        </h2>

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
                <p className="truncate text-sm font-medium text-foreground">
                  {trimmedName || "—"}
                </p>
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
                  {trimmedDomain ? `${trimmedDomain}${LEMNITY_PUBLISH_SUFFIX}` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {NEW_PROJECT_AI_STEP_ENABLED ? (
          <Button
            type="button"
            variant="outline"
            disabled={creatingProject || !canProceed}
            className="h-auto w-full flex-col items-start gap-1 py-4 text-left"
            onClick={() => {
              /* reserved */
            }}
          >
            <span className="flex items-center gap-2 font-semibold">
              <Bot className="size-4 shrink-0" />
              {t("projects_new_via_ai")}
            </span>
            <span className="text-xs font-normal text-muted-foreground">{t("projects_new_via_ai_desc")}</span>
          </Button>
        ) : (
          <Card className="pointer-events-none gap-0 overflow-hidden border-dashed border-muted-foreground/25 bg-muted/25 py-0 opacity-95 shadow-none">
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
          tabIndex={creatingProject || !canProceed ? -1 : 0}
          onClick={() => {
            if (!canProceed || creatingProject) return;
            void navigateNewProjectToEditor("empty");
          }}
          onKeyDown={(e) => {
            if (!canProceed || creatingProject || (e.key !== "Enter" && e.key !== " ")) return;
            e.preventDefault();
            void navigateNewProjectToEditor("empty");
          }}
          className={cn(
            "gap-0 overflow-hidden border-2 py-0 shadow-sm transition-[border-color,box-shadow,background]",
            "cursor-pointer border-sky-200/90 bg-gradient-to-br from-sky-50 via-background to-violet-50/40",
            "hover:border-sky-400/80 hover:from-sky-50/90 hover:shadow-md dark:border-sky-900/60 dark:from-sky-950/55 dark:to-violet-950/30 dark:hover:border-sky-700",
            (!canProceed || creatingProject) && "pointer-events-none opacity-55"
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
      </section>

      <section className="space-y-5 border-t border-border/70 pt-10" aria-labelledby="new-page-templates-heading">
        <header className="space-y-2">
          <h2 id="new-page-templates-heading" className="text-xl font-semibold tracking-tight text-foreground">
            {t("projects_new_page_title")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("projects_new_page_subtitle")}</p>
        </header>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="flex flex-col gap-0 overflow-hidden py-0 shadow-sm">
            <CardContent className="flex flex-1 flex-col gap-4 p-4">
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-muted/80">
                <span className="flex size-24 items-center justify-center rounded-full bg-background text-4xl font-semibold text-muted-foreground shadow-inner ring-1 ring-border/70">
                  T
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{t("projects_template_empty_title")}</h3>
                <p className="text-sm text-muted-foreground">{t("projects_template_empty_desc")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-auto w-full rounded-full font-semibold"
                disabled={creatingProject || subdomainCheck === "checking"}
                onClick={() => void navigateNewProjectToEditor("empty")}
              >
                {t("projects_template_select")}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col gap-0 overflow-hidden py-0 shadow-sm">
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
                <h3 className="font-semibold text-foreground">{t("projects_template_ai_title")}</h3>
                <p className="text-sm text-muted-foreground">{t("projects_template_ai_desc")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-auto w-full rounded-full font-semibold"
                disabled={creatingProject}
                onClick={() => toast.message(t("projects_template_ai_soon_toast"))}
              >
                {t("projects_template_generate")}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col gap-0 overflow-hidden py-0 shadow-sm">
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
                  disabled={creatingProject || subdomainCheck === "checking"}
                  onClick={() => void navigateNewProjectToEditor("universal")}
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

          <Card className="flex flex-col gap-0 overflow-hidden py-0 shadow-sm">
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
                  disabled={creatingProject || subdomainCheck === "checking"}
                  onClick={() => void navigateNewProjectToEditor("consultation")}
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
      </section>
    </div>
  );
}
