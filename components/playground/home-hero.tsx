"use client";

import {
  ArrowUp,
  Building2,
  ChevronRight,
  Cloud,
  Code2,
  Globe,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  Monitor,
  Palette,
  Plus,
  Presentation,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n";

type ActionCategory = "presentation" | "website" | "service" | "design";

const ACTION_DEFS: Array<{
  id: ActionCategory;
  icon: typeof Globe;
  toolbarIcon: typeof Globe;
  labelKey: MessageKey;
  valueKey: MessageKey;
}> = [
  {
    id: "presentation",
    icon: Presentation,
    toolbarIcon: Presentation,
    labelKey: "playground_home_cat_presentation",
    valueKey: "playground_home_val_presentation"
  },
  {
    id: "website",
    icon: Globe,
    toolbarIcon: Code2,
    labelKey: "playground_home_cat_website",
    valueKey: "playground_home_val_website"
  },
  {
    id: "service",
    icon: Monitor,
    toolbarIcon: Monitor,
    labelKey: "playground_home_cat_service",
    valueKey: "playground_home_val_service"
  },
  {
    id: "design",
    icon: Palette,
    toolbarIcon: Palette,
    labelKey: "playground_home_cat_design",
    valueKey: "playground_home_val_design"
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

const TEMPLATE_DEFS: Array<{
  id: string;
  titleKey: MessageKey;
  valueKey: MessageKey;
}> = [
  { id: "saas", titleKey: "playground_home_tpl_saas", valueKey: "playground_home_tpl_saas_prompt" },
  { id: "course", titleKey: "playground_home_tpl_course", valueKey: "playground_home_tpl_course_prompt" },
  { id: "fitness", titleKey: "playground_home_tpl_fitness", valueKey: "playground_home_tpl_fitness_prompt" },
  { id: "cafe", titleKey: "playground_home_tpl_cafe", valueKey: "playground_home_tpl_cafe_prompt" }
];

const HINT_KEYS: MessageKey[] = [
  "playground_home_hint_0",
  "playground_home_hint_1",
  "playground_home_hint_2",
  "playground_home_hint_3"
];

type HomeHeroProps = {
  username: string;
  idea: string;
  onIdeaChange: (v: string) => void;
  tokenBalance: number | null;
  onOpenTemplates: () => void;
  onSelectTemplate: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function HomeHero({
  username,
  idea,
  onIdeaChange,
  tokenBalance,
  onOpenTemplates,
  onSelectTemplate,
  onSubmit,
  disabled
}: HomeHeroProps) {
  const { t, lang } = useI18n();

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
      TEMPLATE_DEFS.map((d) => ({
        id: d.id,
        title: t(d.titleKey),
        value: t(d.valueKey)
      })),
    [t]
  );

  const hintExamples = useMemo(() => HINT_KEYS.map((k) => t(k)), [t]);

  const canSubmit = useMemo(() => idea.trim().length > 0 && !disabled, [disabled, idea]);
  const [activeCategory, setActiveCategory] = useState<ActionCategory | null>("website");
  const websiteTypesScrollRef = useRef<HTMLDivElement>(null);
  const [hintIndex, setHintIndex] = useState(0);

  function openTemplatesUi() {
    onOpenTemplates();
    document.getElementById("playground-templates-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  const [typed, setTyped] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [recent, setRecent] = useState<Array<{ t: number; text: string }>>([]);
  const [tab, setTab] = useState<"templates" | "recent">("templates");

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

  const numberLocale = lang === "en" ? "en-US" : "ru-RU";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0 space-y-4">
      <div className="relative overflow-hidden rounded-3xl border bg-card/70 p-6 shadow-sm md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(168,85,247,.25),transparent_45%),radial-gradient(circle_at_75%_70%,rgba(236,72,153,.18),transparent_48%)]" />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="text-balance font-serif text-4xl font-normal tracking-tight text-foreground md:text-5xl">
            {t("playground_home_title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("playground_home_greeting")}{" "}
            <span className="text-foreground/90">{username}</span>
          </p>

          <div className="mt-6 w-full">
            <div
              className={cn(
                "rounded-[28px] border border-border bg-background p-4 shadow-md",
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
                        onClick={openTemplatesUi}
                        className="inline-flex items-center gap-1.5 text-primary transition hover:text-primary/80"
                      >
                        <Link2 className="h-4 w-4" />
                        <span className="border-b border-primary/40 pb-px">{t("playground_home_ref_site")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={openTemplatesUi}
                        className="inline-flex items-center gap-1.5 text-foreground transition hover:text-primary"
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-[linear-gradient(180deg,#f24e1e,#a259ff,#0acf83)] text-[10px] font-bold text-white"
                          aria-hidden
                        >
                          F
                        </span>
                        <span className="border-b border-border pb-px">{t("playground_home_figma")}</span>
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
              <span className="mx-2 text-border">·</span>
              {tokenBalance === null ? (
                <span>
                  {t("playground_home_tokens")} {t("playground_home_tokens_none")}
                </span>
              ) : (
                <span>
                  {t("playground_home_tokens")}{" "}
                  <span className="font-semibold text-foreground">
                    {tokenBalance.toLocaleString(numberLocale)}
                  </span>{" "}
                  {t("playground_home_tokens_suffix")}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
      </div>

      <div
        id="playground-templates-panel"
        className="flex min-h-[11rem] max-h-[min(56vh,28rem)] flex-1 flex-col overflow-hidden rounded-2xl border bg-card/70 p-3 shadow-sm sm:max-h-[min(52vh,32rem)]"
      >
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "templates" | "recent")}
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <TabsList className="h-9 w-full shrink-0 justify-start sm:w-fit">
            <TabsTrigger value="templates">{t("playground_templates_tab_templates")}</TabsTrigger>
            <TabsTrigger value="recent">{t("playground_templates_tab_recent")}</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-0 flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="grid gap-2 pt-1">
              {templates.map((tpl) => (
                <Button
                  key={tpl.id}
                  variant="outline"
                  className="h-11 justify-start rounded-2xl"
                  onClick={() => {
                    onSelectTemplate(tpl.value);
                    setTab("templates");
                  }}
                >
                  {tpl.title}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-0 flex-1 min-h-0 overflow-y-auto pr-1">
            {recent.length ? (
              <div className="grid gap-2 pt-1">
                {recent.map((r) => (
                  <Button
                    key={r.t}
                    variant="outline"
                    className="h-11 justify-start rounded-2xl"
                    onClick={() => onIdeaChange(r.text)}
                  >
                    <span className="truncate">{r.text}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="pt-1 text-sm text-muted-foreground">{t("playground_templates_empty_recent")}</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

