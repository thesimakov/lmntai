"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, ChevronDown, Image as ImageIcon, Paperclip } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { saveBuilderHandoff } from "@/lib/landing-handoff";
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
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [typed, setTyped] = useState("");
  const [showcaseFilter, setShowcaseFilter] = useState<"all" | LandingShowcaseCategory>("all");
  const [showcaseBySlug, setShowcaseBySlug] = useState<Record<string, ShowcaseImageEntry> | null>(null);

  const placeholderPhrase = useMemo(() => t("landing_dark_typewriter"), [t]);

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
    if (prompt.trim().length > 0 || isFocused) {
      setTyped("");
      return;
    }

    let cancelled = false;
    let charIndex = 0;
    const phrase = placeholderPhrase;

    /** Плавная «печать»: медленный ритм, небольшой разброс по длине символа */
    function nextCharDelayMs(char: string) {
      const base = 88;
      const jitter = 12 + Math.random() * 38;
      const pauseAfter = /[.,…!?;:]$/.test(char) ? 220 + Math.random() * 180 : 0;
      return base + jitter + pauseAfter;
    }

    function tick() {
      if (cancelled) return;
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
        window.setTimeout(tick, 720);
      }, 2200);
    }

    setTyped("");
    const start = window.setTimeout(tick, 520);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [prompt, isFocused, placeholderPhrase]);

  const goApp = useCallback(() => {
    const text = prompt.trim();
    if (!text) return;
    saveBuilderHandoff(text, undefined, null);
    setPostLoginRedirect("/playground/build");
    router.push(authed ? "/playground/build" : "/login");
  }, [authed, prompt, router]);

  return (
    <div className="relative min-h-screen font-sans text-foreground">
      <div className="landing-backdrop" aria-hidden>
        <div className="landing-backdrop__blob landing-backdrop__blob--a" />
        <div className="landing-backdrop__blob landing-backdrop__blob--b" />
        <div className="landing-backdrop__blob landing-backdrop__blob--c" />
      </div>

      <div className="relative z-10">
        <MarketingSiteHeader />

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6 sm:pb-32 sm:pt-14">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-zinc-200/90 bg-white px-4 py-2 text-sm shadow-sm">
            <span className="text-zinc-500">{t("landing_simple_badge_free")}</span>
            <span className="h-3 w-px bg-zinc-300" aria-hidden />
            <button
              type="button"
              onClick={() =>
                router.push(authed ? "/playground" : "/login?register=1")
              }
              className="font-medium text-blue-600 transition hover:text-blue-700"
            >
              {t("landing_simple_badge_trial")}
            </button>
          </div>
        </div>

        <h1
          id="hero-heading"
          className="mx-auto mt-8 max-w-4xl text-center text-3xl font-semibold leading-[1.12] tracking-tight text-zinc-900 sm:mt-10 sm:text-5xl sm:leading-[1.08] md:text-[3.25rem] md:leading-[1.06]"
        >
          {t("landing_simple_hero_h1")}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-zinc-600 sm:mt-6 sm:text-base">
          {t("landing_dark_hero_lead")}
        </p>

        <div id="hero-input" className="mx-auto mt-9 w-full max-w-3xl sm:mt-11">
          <div className="rounded-[1.35rem] border border-zinc-200/90 bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03] sm:rounded-3xl sm:p-4">
            <div className="relative min-h-[76px] sm:min-h-[92px]">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder=""
                rows={3}
                aria-label={t("landing_simple_placeholder")}
                className="min-h-[76px] w-full resize-none border-0 bg-transparent text-[15px] leading-snug text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 sm:min-h-[92px] sm:text-base sm:leading-relaxed"
              />
              <AnimatePresence mode="wait">
                {!prompt.trim() && !isFocused ? (
                  <motion.div
                    key="landing-typewriter"
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
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2">
              <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 sm:rounded-xl"
                  aria-label={t("landing_simple_attach")}
                >
                  <Paperclip className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 sm:rounded-xl"
                  aria-label={t("landing_dark_image_attach_aria")}
                >
                  <ImageIcon className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  className="ml-1 inline-flex max-w-[min(100%,14rem)] items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-1.5 pr-2 text-left text-[11px] font-medium text-zinc-800 shadow-sm sm:max-w-none sm:gap-2 sm:pl-2 sm:pr-2.5 sm:text-[13px]"
                  aria-hidden
                >
                  <span
                    className="flex h-[1.25rem] w-[1.25rem] shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-indigo-600 text-[9px] font-bold text-white sm:h-[1.375rem] sm:w-[1.375rem] sm:text-[10px]"
                    aria-hidden
                  >
                    L
                  </span>
                  <span className="min-w-0 truncate">{t("landing_model_pill_label")}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                onClick={goApp}
                disabled={!prompt.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send"
              >
                <ArrowUp className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.35} />
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-7 flex justify-center px-2 sm:mt-8">
          <div
            className="inline-flex max-w-[min(100%,36rem)] items-center gap-2.5 rounded-full border border-zinc-200/90 bg-white/90 px-4 py-2.5 text-[13px] leading-snug text-zinc-600 shadow-sm backdrop-blur-sm sm:text-sm sm:leading-snug"
            role="status"
            aria-label={`${t("landing_projects_status_before")} ${landingProjectsFormatted} ${t("landing_projects_status_after")}`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(255,255,255,1),0_0_12px_rgba(52,211,153,0.45)]"
              aria-hidden
            />
            <span className="text-left">
              {t("landing_projects_status_before")}{" "}
              <strong className="font-semibold tabular-nums text-zinc-900">{landingProjectsFormatted}</strong>{" "}
              {t("landing_projects_status_after")}
            </span>
          </div>
        </div>

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
              <Link href={authed ? "/projects" : "/login"}>{t("landing_showcase_view_all")}</Link>
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
