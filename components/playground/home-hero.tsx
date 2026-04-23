"use client";

import {
  Activity,
  ArrowUp,
  BookOpen,
  Building2,
  ChevronRight,
  Clock,
  Cloud,
  Code2,
  Coffee,
  FileText,
  Globe,
  IdCard,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  Palette,
  Plus,
  Presentation,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PLAYGROUND_QUICK_TEMPLATES } from "@/lib/playground-templates";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n";

export type HomeHeroActionCategory = "presentation" | "website" | "resume" | "design" | "visitcard";
type ActionCategory = HomeHeroActionCategory;

/** Маркер в промпте: агент и пайплайн могут искать `reference_site:` */
const REFERENCE_SITE_MARKER = "\n\n---\nreference_site:";

function stripReferenceBlock(text: string): string {
  const idx = text.indexOf(REFERENCE_SITE_MARKER);
  if (idx === -1) return text.trimEnd();
  return text.slice(0, idx).trimEnd();
}

function parseExistingReferenceUrl(text: string): string {
  const idx = text.indexOf(REFERENCE_SITE_MARKER);
  if (idx === -1) return "";
  const rest = text.slice(idx + REFERENCE_SITE_MARKER.length).trimStart();
  return rest.split("\n")[0]?.trim() ?? "";
}

function normalizeReferenceUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const ACTION_DEFS: Array<{
  id: ActionCategory;
  icon: typeof Globe;
  toolbarIcon: typeof Globe;
  labelKey: MessageKey;
  valueKey: MessageKey;
}> = [
  {
    id: "website",
    icon: Globe,
    toolbarIcon: Code2,
    labelKey: "playground_home_cat_website",
    valueKey: "playground_home_val_website"
  },
  {
    id: "presentation",
    icon: Presentation,
    toolbarIcon: Presentation,
    labelKey: "playground_home_cat_presentation",
    valueKey: "playground_home_val_presentation"
  },
  {
    id: "resume",
    icon: FileText,
    toolbarIcon: FileText,
    labelKey: "playground_home_cat_resume",
    valueKey: "playground_home_val_resume"
  },
  {
    id: "design",
    icon: Palette,
    toolbarIcon: Palette,
    labelKey: "playground_home_cat_design",
    valueKey: "playground_home_val_design"
  },
  {
    id: "visitcard",
    icon: IdCard,
    toolbarIcon: IdCard,
    labelKey: "playground_home_cat_visitcard",
    valueKey: "playground_home_val_visitcard"
  }
];

const WEBSITE_TYPE_DEFS: Array<{
  icon: typeof LayoutTemplate;
  labelKey: MessageKey;
  valueKey: MessageKey;
}> = [
  { icon: LayoutTemplate, labelKey: "playground_home_site_landing", valueKey: "playground_home_val_site_landing" },
  { icon: LayoutDashboard, labelKey: "playground_home_site_dashboard", valueKey: "playground_home_val_site_dashboard" },
  { icon: Images, labelKey: "playground_home_site_portfolio", valueKey: "playground_home_val_site_portfolio" },
  { icon: Building2, labelKey: "playground_home_site_corporate", valueKey: "playground_home_val_site_corporate" },
  { icon: Cloud, labelKey: "playground_home_site_saas", valueKey: "playground_home_val_site_saas" },
  { icon: Link2, labelKey: "playground_home_site_bylink", valueKey: "playground_home_val_site_bylink" }
];

const HINT_KEYS: MessageKey[] = [
  "playground_home_hint_0",
  "playground_home_hint_1",
  "playground_home_hint_2",
  "playground_home_hint_3"
];

const TEMPLATE_CARD_ICONS: Record<string, typeof Sparkles> = {
  saas: Sparkles,
  course: BookOpen,
  fitness: Activity,
  cafe: Coffee
};

type HomeHeroProps = {
  username: string;
  idea: string;
  onIdeaChange: (v: string) => void;
  onOpenTemplates: () => void;
  onSelectTemplate: (value: string) => void;
  onSubmit: () => void;
  /** Сообщить родителю выбранный тип (для конверта ai-manus / projectKind). */
  onActiveCategoryChange?: (category: HomeHeroActionCategory | null) => void;
  disabled?: boolean;
};

export function HomeHero({
  username,
  idea,
  onIdeaChange,
  onOpenTemplates,
  onSelectTemplate,
  onSubmit,
  onActiveCategoryChange,
  disabled
}: HomeHeroProps) {
  const { t } = useI18n();

  const actionPills = useMemo(
    () =>
      ACTION_DEFS.map((d) => ({
        id: d.id,
        icon: d.icon,
        toolbarIcon: d.toolbarIcon,
        label: t(d.labelKey),
        value: t(d.valueKey)
      })),
    [t]
  );

  const websiteBuildTypes = useMemo(
    () =>
      WEBSITE_TYPE_DEFS.map((d) => ({
        icon: d.icon,
        label: t(d.labelKey),
        value: t(d.valueKey)
      })),
    [t]
  );

  const templates = useMemo(
    () =>
      PLAYGROUND_QUICK_TEMPLATES.map((d) => ({
        id: d.id,
        title: t(d.titleKey),
        value: t(d.valueKey),
        defaultCategory: d.defaultCategory
      })),
    [t]
  );

  const hintExamples = useMemo(() => HINT_KEYS.map((k) => t(k)), [t]);

  const canSubmit = useMemo(() => idea.trim().length > 0 && !disabled, [disabled, idea]);
  const [activeCategory, setActiveCategory] = useState<ActionCategory | null>(null);
  const websiteTypesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onActiveCategoryChange?.(activeCategory);
  }, [activeCategory, onActiveCategoryChange]);
  const [hintIndex, setHintIndex] = useState(0);

  function openTemplatesUi() {
    onOpenTemplates();
  }
  const [typed, setTyped] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [recent, setRecent] = useState<Array<{ t: number; text: string }>>([]);
  const [tab, setTab] = useState<"templates" | "recent">("templates");
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [refUrlDraft, setRefUrlDraft] = useState("");

  function openReferenceDialog() {
    setRefUrlDraft(parseExistingReferenceUrl(idea));
    setRefDialogOpen(true);
  }

  function confirmReferenceUrl() {
    const url = normalizeReferenceUrl(refUrlDraft);
    if (!url) {
      toast.error(t("playground_home_ref_invalid"));
      return;
    }
    const base = stripReferenceBlock(idea);
    const block = `${REFERENCE_SITE_MARKER} ${url}\n`;
    onIdeaChange(
      base ? `${base}${block}` : `${t("playground_home_ref_prompt_prefix")}\n${block.trim()}`
    );
    setRefDialogOpen(false);
  }

  useEffect(() => {
    function readRecent() {
      try {
        const key = "lemnity.recent";
        const data = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{ t: number; text: string }>;
        setRecent(data.slice(0, 4));
      } catch {
        setRecent([]);
      }
    }

    readRecent();
    window.addEventListener("lemnity:recent-updated", readRecent);
    return () => window.removeEventListener("lemnity:recent-updated", readRecent);
  }, []);

  useEffect(() => {
    if (idea.trim().length > 0 || isFocused) {
      setTyped("");
      return;
    }

    let cancelled = false;
    let charIndex = 0;
    const phrase = hintExamples[hintIndex] ?? "";

    function tick() {
      if (cancelled) return;
      charIndex += 1;
      setTyped(phrase.slice(0, charIndex));

      if (charIndex < phrase.length) {
        window.setTimeout(tick, 18 + Math.random() * 22);
        return;
      }

      // Пауза после полного набора, затем следующий пример
      window.setTimeout(() => {
        if (cancelled) return;
        setHintIndex((prev) => (prev + 1) % hintExamples.length);
      }, 900);
    }

    setTyped("");
    window.setTimeout(tick, 280);

    return () => {
      cancelled = true;
    };
  }, [idea, isFocused, hintIndex, hintExamples]);

  const activePill = useMemo(
    () => (activeCategory ? actionPills.find((p) => p.id === activeCategory) ?? null : null),
    [activeCategory, actionPills]
  );

  function scrollWebsiteTypes() {
    websiteTypesScrollRef.current?.scrollBy({ left: 220, behavior: "smooth" });
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <div className="shrink-0 space-y-4">
      <div className="relative overflow-hidden rounded-3xl border bg-card/70 p-6 shadow-sm md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(168,85,247,.25),transparent_45%),radial-gradient(circle_at_75%_70%,rgba(236,72,153,.18),transparent_48%)]" />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="text-balance text-4xl font-normal tracking-tight text-foreground md:text-5xl">
            {t("playground_home_title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("playground_home_greeting")}{" "}
            <span className="text-foreground/90">{username}</span>
          </p>

          <div className="mt-6 w-full">
            <div
              className={cn(
                "rounded-lg border border-border bg-background p-4 shadow-md",
                "text-left"
              )}
            >
              <div className="relative pb-4">
                <Textarea
                  value={idea}
                  onChange={(e) => onIdeaChange(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.shiftKey) return;
                    e.preventDefault();
                    if (canSubmit) onSubmit();
                  }}
                  placeholder=""
                  rows={4}
                  className={cn(
                    "min-h-[108px] w-full resize-none rounded-xl border-0 bg-muted/35 px-3 pb-3 pt-10 text-base shadow-none",
                    "focus-visible:ring-0 focus-visible:ring-offset-0"
                  )}
                />

                <AnimatePresence mode="wait">
                  {!idea.trim() && !isFocused ? (
                    <motion.div
                      key={hintIndex}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="pointer-events-none absolute left-3 top-3 pr-8 text-base text-muted-foreground"
                    >
                      <span>{typed}</span>
                      <motion.span
                        aria-hidden
                        className="ml-0.5 inline-block h-5 w-px align-[-3px] bg-muted-foreground/60"
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="border-t border-border/70 pt-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full border-border bg-background shadow-none"
                    onClick={openTemplatesUi}
                    aria-label={t("playground_home_extra_aria")}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>

                  {activePill ? (
                    (() => {
                      const ToolbarIcon = activePill.toolbarIcon;
                      return (
                        <div
                          className={cn(
                            "group/chip flex shrink-0 items-center gap-1.5 rounded-full border py-2 pl-3 pr-1.5 text-sm font-medium",
                            activeCategory === "website"
                              ? "border-primary/35 bg-primary/10 text-primary"
                              : "border-border bg-muted/50 text-foreground"
                          )}
                        >
                          <ToolbarIcon className="h-4 w-4 shrink-0 opacity-90" />
                          <span className="max-w-[140px] truncate sm:max-w-none">{activePill.label}</span>
                          <button
                            type="button"
                            aria-label={t("playground_home_clear_type_aria")}
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-current opacity-0 transition-opacity",
                              "pointer-events-none hover:bg-background/60 hover:text-foreground",
                              "group-hover/chip:pointer-events-auto group-hover/chip:opacity-100",
                              "focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveCategory(null);
                            }}
                          >
                            <X className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                        </div>
                      );
                    })()
                  ) : null}

                  <span className="min-w-0 flex-1" aria-hidden />

                  <Button
                    type="button"
                    size="icon"
                    className={cn(
                      "h-10 w-10 shrink-0 rounded-full border border-border bg-muted text-foreground shadow-none",
                      "hover:bg-muted/80",
                      !canSubmit && "pointer-events-none opacity-40"
                    )}
                    onClick={() => canSubmit && onSubmit()}
                    disabled={!canSubmit}
                    aria-label={t("playground_home_send_aria")}
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                </div>

              {activeCategory === "website" ? (
                <div className="mt-5 border-t border-border/80 pt-5">
                  <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 md:gap-x-6">
                    <p className="min-w-0 text-pretty text-sm font-medium leading-snug text-foreground">
                      {t("playground_home_what_build")}
                    </p>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:justify-self-end md:gap-x-4">
                      <button
                        type="button"
                        onClick={openReferenceDialog}
                        className="inline-flex items-center gap-1.5 text-primary transition hover:text-primary/80"
                      >
                        <Link2 className="h-4 w-4" />
                        <span className="border-b border-primary/40 pb-px">{t("playground_home_ref_site")}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-stretch gap-2">
                    <div
                      ref={websiteTypesScrollRef}
                      className="flex min-h-10 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {websiteBuildTypes.map(({ icon: Icon, label, value }) => (
                        <Button
                          key={label}
                          type="button"
                          variant="outline"
                          className="h-10 shrink-0 snap-start rounded-2xl border-border bg-background px-3 text-sm font-normal shadow-sm hover:bg-accent"
                          onClick={() => onSelectTemplate(value)}
                        >
                          <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                          {label}
                        </Button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full border-border bg-background shadow-sm"
                      aria-label={t("playground_home_scroll_types_aria")}
                      onClick={scrollWebsiteTypes}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ) : null}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {actionPills.map(({ id, icon: Icon, label, value }) => (
                <Button
                  key={id}
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-9 rounded-full border px-3 text-sm font-normal shadow-sm",
                    activeCategory === id && id === "website"
                      ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                      : activeCategory === id
                        ? "border-foreground/20 bg-accent text-accent-foreground hover:bg-accent/90"
                        : "border-border bg-background hover:bg-accent"
                  )}
                  onClick={() => {
                    setActiveCategory(id);
                    if (!idea.trim()) onSelectTemplate(value);
                  }}
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                  {label}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-border bg-background px-4 text-sm font-normal shadow-sm hover:bg-accent"
                onClick={openTemplatesUi}
              >
                {t("playground_home_more")}
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              <span className="text-muted-foreground/80">{t("playground_home_submit_hint")}</span>
            </p>
          </div>
        </div>
      </div>
      </div>

      <div
        id="playground-templates-panel"
        className="relative flex w-full shrink-0 flex-col overflow-visible rounded-3xl border border-border/50 bg-gradient-to-b from-card via-card/95 to-muted/25 p-1 shadow-[0_1px_0_0_hsl(var(--border)/0.4),0_8px_40px_-12px_hsl(0_0%_0%/0.12)] dark:from-card/90 dark:via-zinc-950/80 dark:to-zinc-950/40 dark:shadow-[0_8px_40px_-12px_hsl(0_0%_0%/0.45)]"
      >
        <div className="border-b border-border/40 bg-gradient-to-r from-violet-500/5 via-transparent to-cyan-500/5 px-4 py-3 dark:from-violet-500/10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-medium tracking-tight text-foreground">{t("playground_templates_title")}</h2>
            <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("playground_templates_hint")}
            </span>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "templates" | "recent")}
          className="flex w-full flex-col gap-0 px-3 pb-3 pt-3"
        >
          <TabsList className="mb-3 h-10 w-full shrink-0 justify-stretch gap-0 rounded-xl bg-muted/70 p-1 dark:bg-zinc-900/80 sm:w-full">
            <TabsTrigger
              value="templates"
              className="flex-1 rounded-lg px-3 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {t("playground_templates_tab_templates")}
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="flex-1 rounded-lg px-3 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {t("playground_templates_tab_recent")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {templates.map((tpl) => {
                const CardIcon = TEMPLATE_CARD_ICONS[tpl.id] ?? LayoutTemplate;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(tpl.value);
                      setActiveCategory(tpl.defaultCategory);
                      setTab("templates");
                    }}
                    className={cn(
                      "group relative w-full text-left transition-all duration-200",
                      "rounded-2xl border border-border/50 bg-gradient-to-b from-background/90 to-muted/15",
                      "p-3.5 shadow-sm",
                      "hover:-translate-y-0.5 hover:border-violet-500/25 hover:shadow-md hover:shadow-violet-500/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      "dark:from-zinc-900/90 dark:to-zinc-950/50 dark:hover:border-violet-400/30 dark:hover:shadow-violet-900/20"
                    )}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          "bg-gradient-to-br from-violet-500/15 to-cyan-500/10 text-violet-600 dark:from-violet-500/25 dark:to-fuchsia-500/10 dark:text-violet-300"
                        )}
                      >
                        <CardIcon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-pretty text-sm font-semibold text-foreground">{tpl.title}</span>
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                        </div>
                        <p className="mt-1 text-pretty text-xs leading-relaxed text-muted-foreground">{tpl.value}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-0 focus-visible:outline-none">
            {recent.length ? (
              <div className="flex flex-col gap-2.5">
                {recent.map((r) => (
                  <button
                    key={r.t}
                    type="button"
                    onClick={() => onIdeaChange(r.text)}
                    className={cn(
                      "group flex w-full gap-3 rounded-2xl border border-border/50 bg-background/50 px-3.5 py-3 text-left",
                      "transition-all hover:border-violet-500/20 hover:bg-accent/50 dark:hover:bg-zinc-900/50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground dark:bg-zinc-800">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="min-w-0 flex-1 text-pretty break-words text-sm text-foreground/90">{r.text}</span>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-60" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[8rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center dark:bg-zinc-900/30">
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t("playground_templates_empty_recent")}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={refDialogOpen} onOpenChange={setRefDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("playground_home_ref_dialog_title")}</DialogTitle>
            <DialogDescription>{t("playground_home_ref_dialog_desc")}</DialogDescription>
          </DialogHeader>
          <Input
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder={t("playground_home_ref_dialog_placeholder")}
            value={refUrlDraft}
            onChange={(e) => setRefUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              confirmReferenceUrl();
            }}
          />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setRefDialogOpen(false)}>
              {t("playground_home_ref_dialog_cancel")}
            </Button>
            <Button type="button" onClick={confirmReferenceUrl}>
              {t("playground_home_ref_dialog_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

