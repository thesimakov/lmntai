"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, ChevronDown, Globe, Image as ImageIcon, Layers, Paperclip, Presentation, Sparkles, BarChart2, TrendingUp, Upload } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { saveBuilderHandoff } from "@/lib/landing-handoff";
import { fileToLandingPendingFile, useLandingFilesStore } from "@/lib/stores/use-landing-files-store";
import {
  getShowcaseCardHref,
  LANDING_SHOWCASE_ITEMS,
  type LandingShowcaseCategory,
  type ShowcaseImageEntry
} from "@/lib/landing-showcase";
import { MarketingSiteHeader } from "@/components/marketing/marketing-site-header";
import { setPostLoginRedirect } from "@/lib/post-login-redirect";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n";

type LandingMode = "site" | "analytics" | "marketing" | "presentation";

const LANDING_PROMPT_PLACEHOLDER_KEY: Record<
  Exclude<LandingMode, "analytics">,
  MessageKey
> = {
  site: "landing_simple_placeholder",
  marketing: "landing_placeholder_marketing",
  presentation: "landing_placeholder_presentation",
};

const LANDING_PROMPT_TYPEWRITER_KEYS: Record<
  Exclude<LandingMode, "analytics">,
  readonly MessageKey[]
> = {
  site: [
    "landing_dark_typewriter",
    "landing_typewriter_site_2",
    "landing_typewriter_site_3",
    "landing_typewriter_site_4",
    "landing_typewriter_site_5",
  ],
  marketing: [
    "landing_typewriter_marketing",
    "landing_typewriter_marketing_2",
    "landing_typewriter_marketing_3",
    "landing_typewriter_marketing_4",
    "landing_typewriter_marketing_5",
  ],
  presentation: [
    "landing_typewriter_presentation",
    "landing_typewriter_presentation_2",
    "landing_typewriter_presentation_3",
    "landing_typewriter_presentation_4",
    "landing_typewriter_presentation_5",
  ],
};

const SHOWCASE_FILTER_ORDER: LandingShowcaseCategory[] = ["website", "resume", "presentation", "other"];

const SHOWCASE_FILTER_LABEL: Record<LandingShowcaseCategory, MessageKey> = {
  website: "landing_showcase_filter_website",
  resume: "landing_showcase_filter_resume",
  presentation: "landing_showcase_filter_presentation",
  other: "landing_showcase_filter_other"
};

const SHOWCASE_SECTION_ENABLED = false;

const LANDING_DISPLAY_PROJECT_COUNT = (() => {
  const raw = process.env.NEXT_PUBLIC_LANDING_PROJECTS_COUNT;
  if (raw == null || String(raw).trim() === "") return 1022;
  const n = Number.parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : 1022;
})();

export function LandingPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { data: session, status } = useSession();
  const authed = status === "authenticated" && Boolean(session);

  const [mode, setMode] = useState<LandingMode>("site");
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [typed, setTyped] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const siteFileInputRef = useRef<HTMLInputElement>(null);
  const setPendingFiles = useLandingFilesStore((s) => s.setPendingFiles);
  const pendingFiles = useLandingFilesStore((s) => s.pendingFiles);

  const [showcaseFilter, setShowcaseFilter] = useState<"all" | LandingShowcaseCategory>("all");
  const [showcaseBySlug, setShowcaseBySlug] = useState<Record<string, ShowcaseImageEntry> | null>(null);

  const promptPlaceholderKey =
    mode === "analytics" ? LANDING_PROMPT_PLACEHOLDER_KEY.site : LANDING_PROMPT_PLACEHOLDER_KEY[mode];

  const typewriterPhrases = useMemo(
    () =>
      mode === "analytics"
        ? []
        : LANDING_PROMPT_TYPEWRITER_KEYS[mode].map((key) => t(key)),
    [mode, t]
  );

  const landingProjectsFormatted = useMemo(() => {
    const loc = lang === "ru" ? "ru-RU" : lang === "tg" ? "tg-TJ" : "en-US";
    return LANDING_DISPLAY_PROJECT_COUNT.toLocaleString(loc);
  }, [lang]);

  const showcaseCategoryCounts = useMemo(() => {
    const m: Record<LandingShowcaseCategory, number> = {
      website: 0,
      resume: 0,
      presentation: 0,
      other: 0
    };
    for (const item of LANDING_SHOWCASE_ITEMS) {
      m[item.category] += 1;
    }
    return m;
  }, []);

  const showcaseFilterOptions = useMemo(
    () => SHOWCASE_FILTER_ORDER.filter((c) => showcaseCategoryCounts[c] > 0),
    [showcaseCategoryCounts]
  );

  const showShowcaseFilter = showcaseFilterOptions.length > 1;

  const showcaseItemsFiltered = useMemo(() => {
    if (showcaseFilter === "all") return [...LANDING_SHOWCASE_ITEMS];
    return LANDING_SHOWCASE_ITEMS.filter((i) => i.category === showcaseFilter);
  }, [showcaseFilter]);

  useEffect(() => {
    if (!showShowcaseFilter) {
      setShowcaseFilter("all");
      return;
    }
    if (showcaseFilter !== "all" && showcaseCategoryCounts[showcaseFilter] === 0) {
      setShowcaseFilter("all");
    }
  }, [showShowcaseFilter, showcaseFilter, showcaseCategoryCounts]);

  useEffect(() => {
    if (!SHOWCASE_SECTION_ENABLED) return;
    let cancelled = false;
    fetch("/api/showcase-images")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body: { bySlug?: Record<string, ShowcaseImageEntry> }) => {
        if (!cancelled && body?.bySlug && typeof body.bySlug === "object") {
          setShowcaseBySlug(body.bySlug);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== "site" && mode !== "marketing" && mode !== "presentation") return;
    if (prompt.trim().length > 0 || isFocused) {
      setTyped("");
      return;
    }

    if (typewriterPhrases.length === 0) return;

    let cancelled = false;
    let charIndex = 0;
    let phraseIndex = 0;

    function nextCharDelayMs(char: string) {
      const base = 88;
      const jitter = 12 + Math.random() * 38;
      const pauseAfter = /[.,…!?;:]$/.test(char) ? 220 + Math.random() * 180 : 0;
      return base + jitter + pauseAfter;
    }

    function tick() {
      if (cancelled) return;
      const phrase = typewriterPhrases[phraseIndex] ?? typewriterPhrases[0]!;
      charIndex += 1;
      setTyped(phrase.slice(0, charIndex));

      if (charIndex < phrase.length) {
        const ch = phrase.charAt(charIndex - 1);
        window.setTimeout(tick, nextCharDelayMs(ch));
        return;
      }

      window.setTimeout(() => {
        if (cancelled) return;
        charIndex = 0;
        setTyped("");
        phraseIndex = (phraseIndex + 1) % typewriterPhrases.length;
        window.setTimeout(tick, 720);
      }, 2200);
    }

    setTyped("");
    const start = window.setTimeout(tick, 520);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [mode, prompt, isFocused, typewriterPhrases]);

  const goApp = useCallback(() => {
    const text = prompt.trim();
    if (!text) return;
    saveBuilderHandoff(text, undefined, null);
    setPostLoginRedirect("/playground/build");
    router.push(authed ? "/playground/build" : "/login");
  }, [authed, prompt, router]);

  const goAnalytics = useCallback(async () => {
    if (!authed) {
      setPostLoginRedirect("/api/analytics/new");
      router.push("/login");
      return;
    }
    try {
      const res = await fetch(`/api/analytics/new?lang=${encodeURIComponent(lang)}`, {
        redirect: "manual",
        credentials: "include",
      });
      const location = res.headers.get("location") ?? res.url;
      if (location && !location.includes("/api/analytics/new")) {
        router.push(location);
        return;
      }
    } catch {
      /* fallback */
    }
    router.push(`/api/analytics/new?lang=${encodeURIComponent(lang)}`);
  }, [authed, lang, router]);

  const goMarketing = useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;
    try {
      sessionStorage.setItem("lemnity.landing.marketing.prompt", text);
    } catch {
      // ignore
    }
    if (!authed) {
      setPostLoginRedirect("/playground/marketing");
      router.push("/login");
      return;
    }
    try {
      const res = await fetch(`/api/marketing/new?lang=${encodeURIComponent(lang)}`, { redirect: "manual" });
      const location = res.headers.get("location") ?? res.url;
      if (location && !location.includes("/api/marketing/new")) {
        router.push(location);
        return;
      }
    } catch {
      // fallback
    }
    router.push(`/playground/marketing?lang=${encodeURIComponent(lang)}`);
  }, [authed, lang, prompt, router]);

  const goPresentation = useCallback(() => {
    const text = prompt.trim();
    if (!text) return;
    saveBuilderHandoff(text, "presentation", null);
    setPostLoginRedirect("/playground/build");
    router.push(authed ? "/playground/build" : "/login");
  }, [authed, prompt, router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) setUploadedFiles((prev) => [...prev, ...files].slice(0, 5));
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) setUploadedFiles((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  }, []);

  const handleSiteFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setPendingFiles(
        [...pendingFiles, ...files.map(fileToLandingPendingFile)].slice(0, 5)
      );
    }
    e.target.value = "";
  }, [pendingFiles, setPendingFiles]);

  const handleModeSwitch = useCallback((next: LandingMode) => {
    setMode(next);
    if (next === "analytics") {
      setPendingFiles([]);
    } else {
      setUploadedFiles([]);
    }
  }, [setPendingFiles]);

  return (
    <div className="relative min-h-screen font-sans text-foreground">
      <div className="landing-backdrop" aria-hidden>
        <div className="landing-backdrop__blob landing-backdrop__blob--a" />
        <div className="landing-backdrop__blob landing-backdrop__blob--b" />
        <div className="landing-backdrop__blob landing-backdrop__blob--c" />
        {([
          { size: 7,  left: "13%", top: "22%", color: "rgba(59,130,246,0.55)",   shadow: "rgba(59,130,246,0.35)",  dur: 8,  del: -2,  y: [0,-24,-8,0],    x: [0,10,-6,0]     },
          { size: 5,  left: "78%", top: "14%", color: "rgba(99,102,241,0.5)",    shadow: "rgba(99,102,241,0.3)",   dur: 11, del: -5,  y: [0,-16,-28,-4,0], x: [0,-13,8,14,0]  },
          { size: 8,  left: "88%", top: "54%", color: "rgba(251,146,60,0.45)",   shadow: "rgba(251,146,60,0.25)",  dur: 9,  del: -3,  y: [0,-20,-6,0],    x: [0,-8,12,0]     },
          { size: 4,  left: "30%", top: "72%", color: "rgba(139,92,246,0.45)",   shadow: "rgba(139,92,246,0.25)",  dur: 12, del: -7,  y: [0,-18,-30,-8,0], x: [0,11,-7,16,0]  },
          { size: 6,  left: "55%", top: "10%", color: "rgba(59,130,246,0.4)",    shadow: "rgba(59,130,246,0.2)",   dur: 10, del: -1,  y: [0,-22,-10,0],   x: [0,-5,14,0]     },
          { size: 5,  left: "5%",  top: "58%", color: "rgba(99,102,241,0.35)",   shadow: "rgba(99,102,241,0.2)",   dur: 13, del: -6,  y: [0,-12,-25,-5,0], x: [0,14,-9,18,0]  },
        ] as const).map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: p.left,
              top: p.top,
              background: p.color,
              boxShadow: `0 0 ${p.size * 2.5}px ${p.shadow}`,
            }}
            animate={{ y: [...p.y], x: [...p.x], opacity: [0.4, 0.75, 0.5, 0.4] }}
            transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.del }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <MarketingSiteHeader />

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6 sm:pb-32 sm:pt-14">
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-zinc-200/90 bg-white px-4 py-2 text-sm shadow-sm">
              <span className="text-zinc-500">{t("landing_simple_badge_free")}</span>
              <span className="h-3 w-px bg-zinc-300" aria-hidden />
              <button
                type="button"
                onClick={() => router.push(authed ? "/playground" : "/login?register=1")}
                className="font-medium text-blue-600 transition hover:text-blue-700"
              >
                {t("landing_simple_badge_trial")}
              </button>
            </div>
          </motion.div>

          <motion.h1
            id="hero-heading"
            className="hero-heading-gradient mx-auto mt-8 max-w-4xl text-center text-3xl font-semibold leading-[1.12] tracking-tight sm:mt-10 sm:text-5xl sm:leading-[1.08] md:text-[3.25rem] md:leading-[1.06]"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            {t("landing_simple_hero_h1")}
          </motion.h1>

          <motion.p
            className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-zinc-600 sm:mt-6 sm:text-base"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("landing_dark_hero_lead")}
          </motion.p>

          {/* Single input card */}
          <motion.div
            id="hero-input"
            className="mx-auto mt-10 w-full max-w-2xl sm:mt-12"
            initial={{ opacity: 0, y: 28, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative flex flex-col overflow-hidden rounded-3xl border border-zinc-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.03]">
              <div className="landing-card-stripe" />

              {/* Content area */}
              <div className="flex min-h-[60px] flex-1 flex-col px-5 pt-5 pb-[22px] sm:px-6 sm:pt-[22px] sm:pb-[22px]">
                <AnimatePresence mode="wait">
                  {mode === "analytics" ? (
                    <motion.div
                      key="analytics-mode"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div
                        className={cn(
                          "flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-colors",
                          isDragOver
                            ? "border-blue-400 bg-blue-50/60"
                            : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                        aria-label="Загрузить файлы для анализа"
                      >
                        {uploadedFiles.length === 0 ? (
                          <>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                              <Upload className="h-5 w-5 text-blue-500" strokeWidth={1.75} />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-zinc-700">
                                {t("landing_analytics_drop_title")}
                              </p>
                              <p className="mt-1 text-xs text-zinc-400">
                                {t("landing_analytics_drop_hint")}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="w-full space-y-1.5">
                            {uploadedFiles.map((f, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 rounded-lg bg-blue-50/80 px-3 py-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <BarChart2 className="h-3.5 w-3.5 shrink-0 text-blue-500" strokeWidth={2} />
                                <span className="min-w-0 flex-1 truncate text-xs text-zinc-700">{f.name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUploadedFiles((prev) => prev.filter((_, j) => j !== i));
                                  }}
                                  className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700"
                                  aria-label="Удалить файл"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                              className="mt-2 w-full rounded-lg border border-dashed border-zinc-200 py-1.5 text-xs text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 transition-colors"
                            >
                              + {t("landing_analytics_add_more")}
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                        {t("landing_analytics_description")}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".csv,.xlsx,.xls,.pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </motion.div>
                  ) : (
                      <motion.div
                      key={mode}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="relative min-h-[79px]">
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              if (mode === "marketing") void goMarketing();
                              else if (mode === "presentation") goPresentation();
                              else goApp();
                            }
                          }}
                          placeholder=""
                          rows={4}
                          aria-label={t(promptPlaceholderKey)}
                          className="h-[79px] min-h-[79px] w-full resize-none border-0 bg-transparent text-[15px] leading-snug text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 sm:text-base sm:leading-relaxed"
                        />
                        <AnimatePresence mode="wait">
                          {!prompt.trim() && !isFocused ? (
                            <motion.div
                              key={`landing-typewriter-${mode}`}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -3 }}
                              transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 28,
                                mass: 0.85,
                                opacity: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
                              }}
                              className="pointer-events-none absolute left-0 top-0 z-10 pr-12 text-[15px] leading-snug text-zinc-400 sm:text-base sm:leading-relaxed"
                            >
                              <span>{typed}</span>
                              <motion.span
                                aria-hidden
                                className="ml-0.5 inline-block h-[1.1em] w-px translate-y-px bg-zinc-400/70"
                                animate={{ opacity: [0.35, 1, 0.35] }}
                                transition={{
                                  duration: 1.65,
                                  repeat: Number.POSITIVE_INFINITY,
                                  ease: "easeInOut"
                                }}
                              />
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                        {/* Pending file chips (site/marketing/presentation) */}
                        {pendingFiles.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {pendingFiles.map((pf) => (
                              <div
                                key={pf.id}
                                className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
                              >
                                <Paperclip className="h-3 w-3 shrink-0 text-zinc-400" strokeWidth={1.75} />
                                <span className="max-w-[140px] truncate">{pf.file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setPendingFiles(pendingFiles.filter((x) => x.id !== pf.id))}
                                  className="shrink-0 text-zinc-400 hover:text-zinc-700"
                                  aria-label="Удалить файл"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        ref={siteFileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleSiteFileChange}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom bar: mode toggle + action */}
              <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-5 py-3 sm:px-6">
                {/* Mode toggle */}
                <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-xl bg-zinc-100 p-1">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("site")}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                      mode === "site"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    <Sparkles className="h-3 w-3" strokeWidth={2} />
                    {t("landing_mode_site")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("analytics")}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                      mode === "analytics"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    <BarChart2 className="h-3 w-3" strokeWidth={2} />
                    {t("landing_mode_analytics")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("marketing")}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                      mode === "marketing"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    <TrendingUp className="h-3 w-3" strokeWidth={2} />
                    {t("nav_marketing_bi")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("presentation")}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                      mode === "presentation"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    <Presentation className="h-3 w-3" strokeWidth={2} />
                    {t("nav_presentation")}
                  </button>
                </div>

                {/* Action */}
                {mode === "analytics" ? (
                  <button
                    type="button"
                    onClick={goAnalytics}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
                  >
                    {t("landing_analytics_cta")}
                    <ArrowUp className="h-3 w-3 rotate-90" strokeWidth={2.5} />
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => siteFileInputRef.current?.click()}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
                      aria-label={t("landing_simple_attach")}
                    >
                      <Paperclip className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={
                        mode === "marketing"
                          ? () => { void goMarketing(); }
                          : mode === "presentation"
                            ? goPresentation
                            : goApp
                      }
                      disabled={!prompt.trim()}
                      className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Send"
                    >
                      <ArrowUp className="h-4 w-4" strokeWidth={2.35} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Status bar */}
          <motion.div
            className="mx-auto mt-7 flex justify-center px-2 sm:mt-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="inline-flex max-w-[min(100%,40rem)] items-center gap-2.5 rounded-full border border-zinc-200/90 bg-white/90 px-4 py-2.5 text-[13px] leading-snug text-zinc-600 shadow-sm backdrop-blur-sm sm:text-sm sm:leading-snug"
              role="status"
            >
              <span className="flex shrink-0 items-center gap-1">
                <span className="landing-status-dot" aria-hidden />
              </span>
              <span className="text-left">
                <strong className="font-semibold tabular-nums text-zinc-900">{landingProjectsFormatted}</strong>{" "}
                {t("landing_projects_status_after")}
              </span>
            </div>
          </motion.div>

          {/* Features strip */}
          <motion.section
            className="mx-auto mt-20 w-full"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {([
                {
                  titleKey: "landing_feature_1_title",
                  descKey: "landing_feature_1_desc",
                  Icon: Sparkles,
                  iconBg: "bg-blue-50",
                  iconColor: "text-blue-600",
                },
                {
                  titleKey: "landing_feature_2_title",
                  descKey: "landing_feature_2_desc",
                  Icon: Layers,
                  iconBg: "bg-violet-50",
                  iconColor: "text-violet-600",
                },
                {
                  titleKey: "landing_feature_3_title",
                  descKey: "landing_feature_3_desc",
                  Icon: Globe,
                  iconBg: "bg-amber-50",
                  iconColor: "text-amber-600",
                },
              ] as const).map(({ titleKey, descKey, Icon, iconBg, iconColor }) => (
                <motion.div
                  key={titleKey}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm"
                  style={{ transformPerspective: 900 }}
                  whileHover={{
                    rotateX: -4,
                    rotateY: 4,
                    scale: 1.025,
                    y: -4,
                    boxShadow: "0 16px 40px rgba(15,23,42,0.10)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                >
                  <div className={cn("inline-flex rounded-xl p-2.5", iconBg)}>
                    <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-zinc-900">{t(titleKey)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{t(descKey)}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Bottom CTA */}
          <motion.section
            className="mx-auto mt-20 w-full rounded-3xl border border-zinc-200/80 bg-white px-8 py-14 text-center shadow-sm"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          >
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              {t("landing_cta_title")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500 sm:text-base">
              {t("landing_cta_desc")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => router.push(authed ? "/playground" : "/login?register=1")}
                className="rounded-full px-7"
              >
                {t("landing_simple_badge_trial")}
              </Button>
            </div>
          </motion.section>

          {SHOWCASE_SECTION_ENABLED ? (
          <section id="showcase" className="mx-auto mt-20 w-full scroll-mt-24">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
                  {t("landing_showcase_title")}
                </h2>
                <p className="mt-2 text-base text-zinc-600 sm:text-lg">{t("landing_showcase_subtitle")}</p>
              </div>
              <Button
                variant="outline"
                className="w-full shrink-0 rounded-full border-zinc-300 bg-white px-6 text-zinc-800 shadow-sm hover:bg-zinc-50 sm:w-auto"
                asChild
              >
                <Link href={authed ? "/projects" : "/"}>{t("landing_showcase_view_all")}</Link>
              </Button>
            </div>

            {showShowcaseFilter ? (
              <div
                className="mt-8 flex flex-wrap items-center gap-2"
                role="group"
                aria-label={t("landing_showcase_title")}
              >
                <button
                  type="button"
                  onClick={() => setShowcaseFilter("all")}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                    showcaseFilter === "all"
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200/90 bg-white text-zinc-700 shadow-sm hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  {t("landing_showcase_filter_all")}
                </button>
                {showcaseFilterOptions.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setShowcaseFilter(cat)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                      showcaseFilter === cat
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200/90 bg-white text-zinc-700 shadow-sm hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                  >
                    {t(SHOWCASE_FILTER_LABEL[cat])}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {showcaseItemsFiltered.map((item) => {
                const resolved = showcaseBySlug?.[item.slug];
                const imageSrc = resolved?.url ?? item.imageSrc;
                const credit = resolved?.credit;
                const cardHref = getShowcaseCardHref(item);
                const titleText = t(item.titleKey as MessageKey);
                return (
                  <div
                    key={item.slug}
                    className="group block outline-none focus-within:ring-2 focus-within:ring-zinc-400 focus-within:ring-offset-2 focus-within:ring-offset-[#f4f4f3] rounded-2xl"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-200 shadow-sm ring-1 ring-zinc-200/80">
                      <a
                        href={cardHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 z-0 block"
                        aria-label={titleText}
                      >
                        <Image
                          src={imageSrc}
                          alt={titleText}
                          fill
                          unoptimized={imageSrc.endsWith(".svg")}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition duration-300 ease-out group-hover:scale-[1.03]"
                        />
                      </a>
                      {credit ? (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-2 pb-2 pt-10 text-left">
                          <p className="pointer-events-auto text-[10px] leading-snug text-white/95">
                            <span className="text-white/80">{t("landing_showcase_photo_prefix")} </span>
                            <a
                              href={credit.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-white underline decoration-white/50 underline-offset-2 hover:decoration-white"
                            >
                              {credit.name}
                            </a>
                            <span className="text-white/70"> · </span>
                            <a
                              href={credit.photoPageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white underline decoration-white/50 underline-offset-2 hover:decoration-white"
                            >
                              Unsplash
                            </a>
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <a
                      href={cardHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f4f3]"
                    >
                      <h3 className="text-base font-semibold text-zinc-900">{titleText}</h3>
                      <p className="mt-1 text-sm leading-snug text-zinc-500">{t(item.descKey as MessageKey)}</p>
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
          ) : null}
        </main>

        <footer className="border-t border-zinc-200/80 py-8 text-center text-xs text-zinc-500">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/login" className="hover:text-zinc-800">
              {t("landing_footer_login")}
            </Link>
            <Link href="/plans" className="hover:text-zinc-800">
              {t("landing_simple_nav_pricing")}
            </Link>
            <Link href="/docs" className="hover:text-zinc-800">
              {t("landing_simple_nav_docs")}
            </Link>
            <Link href={authed ? "/playground" : "/login"} className="hover:text-zinc-800">
              {t("landing_footer_dashboard")}
            </Link>
          </div>
          <p className="mt-4">
            © {new Date().getFullYear()} {t("landing_footer_copyright")}
          </p>
        </footer>
      </div>
    </div>
  );
}
