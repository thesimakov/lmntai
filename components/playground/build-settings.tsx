"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Copy,
  Globe,
  LayoutGrid,
  LayoutTemplate,
  Link2,
  Lock,
  Plug
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Integrations } from "@/components/dashboard/integrations";
import type { MessageKey } from "@/lib/i18n";
import {
  PUBLISH_BUILTIN_BASE_DOMAIN,
  normalizePublishSubdomainLabel,
  suggestPublishSubdomain
} from "@/lib/publish-host";
import { buildBuiltinPublishBrowseUrl, copyTextToClipboard, buildCanonicalSharePageHref } from "@/lib/preview-share";
import { SHARE_BRANDING_REMOVAL_PRICE_RUB } from "@/lib/share-branding";
import { cn } from "@/lib/utils";

type SettingsSection = "overview" | "domains" | "metrica" | "integrations";

export type BuildSettingsProps = {
  className?: string;
  projectTitle: string;
  studioOpenedAt: Date;
  sandboxId: string | null;
  hasPreview: boolean;
  shareIsPublic: boolean;
  onShareIsPublicChange: (v: boolean) => void;
  hasProPlan: boolean;
  shareBrandingRemovalPaid: boolean;
  /** Для подсказки поддомена (как в диалоге публикации). */
  publishSeedText?: string;
  onOpenPublishDialog?: () => void;
  /** После сохранения настройки брендинга — обновить футер превью в студии. */
  onBrandingPreferenceSaved?: () => void;
};

/** Упрощённая иконка в духе логотипа Метрики (сегменты). */
function MetricaNavIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden
    >
      <path d="M8 1.5A6.5 6.5 0 0 1 13.5 8H8V1.5Z" fill="#5891ff" />
      <path d="M8 14.5A6.5 6.5 0 0 1 2.5 8H8v6.5Z" fill="#ff4544" />
      <path d="M8 8V2.5A5.5 5.5 0 0 0 3.2 11.8L8 8Z" fill="#ffcf55" />
    </svg>
  );
}

function formatStudioDate(lang: string, date: Date): string {
  const locale = lang === "ru" ? "ru-RU" : lang === "tg" ? "tg-TJ" : "en-US";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
  }
}

export function BuildSettings({
  className,
  projectTitle,
  studioOpenedAt,
  sandboxId,
  hasPreview,
  shareIsPublic,
  onShareIsPublicChange,
  hasProPlan,
  shareBrandingRemovalPaid,
  publishSeedText,
  onOpenPublishDialog,
  onBrandingPreferenceSaved
}: BuildSettingsProps) {
  const { t, lang } = useI18n();
  const { update: updateSession } = useSession();
  const [section, setSection] = useState<SettingsSection>("overview");
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [hideHeaderPref, setHideHeaderPref] = useState<boolean | null>(null);
  const [brandingBusy, setBrandingBusy] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [publishSubdomainDraft, setPublishSubdomainDraft] = useState("");

  useEffect(() => {
    setPublishSubdomainDraft(suggestPublishSubdomain(publishSeedText, sandboxId));
  }, [publishSeedText, sandboxId]);

  const cleanPublishSubdomain = useMemo(() => {
    const normalized = normalizePublishSubdomainLabel(publishSubdomainDraft);
    return normalized || suggestPublishSubdomain(publishSeedText, sandboxId);
  }, [publishSeedText, publishSubdomainDraft, sandboxId]);

  const canonicalShareFallbackHref = useMemo(
    () => (sandboxId ? buildCanonicalSharePageHref(sandboxId) : ""),
    [sandboxId]
  );

  const openPublishDialog = useCallback(() => {
    onOpenPublishDialog?.();
  }, [onOpenPublishDialog]);

  const copyBuiltinPublishUrl = useCallback(async () => {
    const fqdn = `${cleanPublishSubdomain}.${PUBLISH_BUILTIN_BASE_DOMAIN}`;
    const url =
      typeof window !== "undefined" && sandboxId
        ? buildBuiltinPublishBrowseUrl(window.location.origin, sandboxId, fqdn)
        : `https://${fqdn}`;
    const ok = await copyTextToClipboard(url);
    if (ok) {
      toast.success(t("build_settings_domains_copy_toast"));
    } else {
      toast.error(t("playground_toast_copy_failed"));
    }
  }, [cleanPublishSubdomain, sandboxId, t]);

  const copyCanonicalShareFallback = useCallback(async () => {
    if (!canonicalShareFallbackHref) return;
    const ok = await copyTextToClipboard(canonicalShareFallbackHref);
    if (ok) {
      toast.success(t("build_settings_domains_fallback_copy_toast"));
    } else {
      toast.error(t("playground_toast_copy_failed"));
    }
  }, [canonicalShareFallbackHref, t]);

  const priceLabel = String(SHARE_BRANDING_REMOVAL_PRICE_RUB);
  const withPrice = useCallback((s: string) => s.replaceAll("{price}", priceLabel), [priceLabel]);

  const checkoutHref =
    typeof process.env.NEXT_PUBLIC_SHARE_BRANDING_CHECKOUT_URL === "string" &&
    process.env.NEXT_PUBLIC_SHARE_BRANDING_CHECKOUT_URL.length > 0
      ? process.env.NEXT_PUBLIC_SHARE_BRANDING_CHECKOUT_URL
      : "/pricing";

  useEffect(() => {
    if (!sandboxId) {
      setHideHeaderPref(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`);
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as { hideLemnityHeader?: boolean };
        if (!cancelled) {
          setHideHeaderPref(
            typeof data.hideLemnityHeader === "boolean" ? data.hideLemnityHeader : false
          );
        }
      } catch {
        if (!cancelled) setHideHeaderPref(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sandboxId]);

  const persistHideHeader = useCallback(
    async (hide: boolean) => {
      if (!sandboxId || brandingBusy) return false;
      try {
        setBrandingBusy(true);
        const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share/branding`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hideLemnityHeader: hide })
        });
        if (res.status === 402) {
          return false;
        }
        if (!res.ok) {
          toast.error(t("build_settings_watermark_toast_error"));
          return false;
        }
        const data = (await res.json().catch(() => ({}))) as { hideLemnityHeader?: boolean };
        setHideHeaderPref(Boolean(data.hideLemnityHeader));
        toast.success(t("build_settings_watermark_toast_saved"));
        onBrandingPreferenceSaved?.();
        return true;
      } catch {
        toast.error(t("build_settings_watermark_toast_error"));
        return false;
      } finally {
        setBrandingBusy(false);
      }
    },
    [sandboxId, brandingBusy, t, onBrandingPreferenceSaved]
  );

  const verifyPaymentAndEnable = useCallback(async () => {
    if (!sandboxId) return;
    try {
      setBrandingBusy(true);
      await updateSession?.();
      const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hideLemnityHeader: true })
      });
      if (res.status === 402) {
        toast.error(t("build_settings_watermark_toast_still_unpaid"));
        return;
      }
      if (!res.ok) {
        toast.error(t("build_settings_watermark_toast_error"));
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { hideLemnityHeader?: boolean };
      setHideHeaderPref(Boolean(data.hideLemnityHeader));
      setPaymentDialogOpen(false);
      toast.success(t("build_settings_watermark_toast_saved"));
      onBrandingPreferenceSaved?.();
      await updateSession?.();
    } catch {
      toast.error(t("build_settings_watermark_toast_error"));
    } finally {
      setBrandingBusy(false);
    }
  }, [sandboxId, updateSession, t, onBrandingPreferenceSaved]);

  const setSharePublic = useCallback(
    async (wantPublic: boolean) => {
      if (!sandboxId || visibilityBusy) return;
      if (wantPublic === shareIsPublic) return;
      try {
        setVisibilityBusy(true);
        const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`, {
          method: wantPublic ? "POST" : "DELETE"
        });
        if (!res.ok) {
          const text = await res.text();
          toast.error(text || t("playground_build_share_error_settings"));
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { isPublic?: boolean };
        onShareIsPublicChange(data.isPublic ?? wantPublic);
      } catch {
        toast.error(t("playground_build_share_error_settings"));
      } finally {
        setVisibilityBusy(false);
      }
    },
    [sandboxId, visibilityBusy, shareIsPublic, onShareIsPublicChange, t]
  );

  const navItems: { id: SettingsSection; labelKey: MessageKey; icon: ReactNode }[] = [
    { id: "overview", labelKey: "build_settings_nav_overview", icon: <LayoutGrid className="h-4 w-4 shrink-0" /> },
    { id: "domains", labelKey: "build_settings_nav_domains", icon: <Globe className="h-4 w-4 shrink-0" /> },
    {
      id: "metrica",
      labelKey: "build_settings_nav_metrica",
      icon: <MetricaNavIcon />
    },
    { id: "integrations", labelKey: "build_settings_nav_integrations", icon: <Plug className="h-4 w-4 shrink-0" /> }
  ];

  const domainsPanel = (
    <div className="space-y-4">
      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="space-y-4 px-4 py-5 sm:px-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("build_settings_domains_builtin_label")}
          </p>
          <div className="flex items-stretch gap-2">
            <div className="flex min-h-11 min-w-0 flex-1 items-center rounded-xl border border-border bg-muted/25 px-3 text-sm">
              <span className="shrink-0 text-muted-foreground">https://</span>
              <Input
                value={cleanPublishSubdomain}
                onChange={(e) => setPublishSubdomainDraft(e.target.value)}
                className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm font-semibold text-foreground shadow-none focus-visible:ring-0"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                aria-label={t("build_settings_domains_builtin_label")}
              />
              <span className="shrink-0 text-muted-foreground">.{PUBLISH_BUILTIN_BASE_DOMAIN}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl"
              aria-label={t("build_settings_domains_copy_aria")}
              onClick={() => void copyBuiltinPublishUrl()}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            className="w-full gap-2 rounded-xl shadow-sm"
            disabled={!sandboxId || !onOpenPublishDialog}
            onClick={openPublishDialog}
          >
            <Globe className="h-4 w-4" aria-hidden />
            {t("build_settings_domains_publish_cta")}
          </Button>
          {sandboxId && canonicalShareFallbackHref ? (
            <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/15 px-3 py-3">
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("build_settings_domains_fallback_hint").replace(
                  "{domain}",
                  PUBLISH_BUILTIN_BASE_DOMAIN
                )}
              </p>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1 truncate rounded-lg border border-border/60 bg-background/80 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                  {canonicalShareFallbackHref}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-lg"
                  aria-label={t("build_settings_domains_fallback_copy_aria")}
                  onClick={() => void copyCanonicalShareFallback()}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardContent className="space-y-4 px-4 py-5 sm:px-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("build_settings_domains_custom_label")}
          </p>
          <Button
            type="button"
            className="w-full gap-2 rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            disabled={!sandboxId || !onOpenPublishDialog}
            onClick={openPublishDialog}
          >
            <Link2 className="h-4 w-4" aria-hidden />
            {t("build_settings_domains_custom_publish_cta")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const metricaPanel = (
    <>
      <Card className="gap-0 overflow-hidden border-border py-0 shadow-sm">
        <CardHeader className="border-b border-border bg-background px-4 py-4 sm:px-5">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 shadow-sm">
              <MetricaNavIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold leading-tight tracking-tight">
                {t("build_settings_metrica_title")}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{t("build_settings_metrica_subtitle")}</p>
            </div>
          </div>
        </CardHeader>
      </Card>
      <Integrations
        embedded
        integrationIdsFilter={["yandex-metrika"]}
        showPageIntro={false}
        showWidgetsBanner={false}
      />
    </>
  );

  const integrationsPanel = <Integrations embedded integrationIdsOmit={["yandex-metrika"]} />;

  const sectionMobileTitle: Record<SettingsSection, MessageKey> = {
    overview: "build_settings_nav_overview",
    domains: "build_settings_nav_domains",
    metrica: "build_settings_nav_metrica",
    integrations: "build_settings_nav_integrations"
  };

  const hasProjectName = Boolean(projectTitle.trim());
  const displayTitle = hasProjectName ? projectTitle.trim() : t("build_settings_overview_untitled");
  const titleInitial = hasProjectName
    ? displayTitle.trim().charAt(0).toUpperCase()
    : "";
  const publicationState = !hasPreview ? "no_preview" : shareIsPublic ? "public" : "private";
  const dateLabel = formatStudioDate(lang, studioOpenedAt);
  const visibilityDisabled = !sandboxId || visibilityBusy;

  const statusBadge =
    publicationState === "public" ? (
      <Badge className="border-emerald-200/80 bg-emerald-50 font-normal text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50">
        {t("build_settings_overview_status_published")}
      </Badge>
    ) : publicationState === "private" ? (
      <Badge variant="secondary" className="font-normal">
        {t("build_settings_overview_status_private_preview")}
      </Badge>
    ) : (
      <Badge variant="outline" className="border-dashed font-normal text-muted-foreground">
        {t("build_settings_overview_status_no_preview")}
      </Badge>
    );

  const overviewVisibilityCard = (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/25 px-4 py-4 sm:px-5">
        <CardTitle className="text-base font-semibold tracking-tight">
          {t("build_settings_overview_visibility_title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={visibilityDisabled}
            onClick={() => void setSharePublic(true)}
            className={cn(
              "flex min-h-[3.75rem] items-center rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
              visibilityDisabled && "cursor-not-allowed opacity-60",
              shareIsPublic
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:bg-muted/50"
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Globe
                  className={cn(
                    "h-4 w-4 shrink-0",
                    shareIsPublic ? "text-primary" : "text-muted-foreground"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    shareIsPublic ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {t("build_settings_visibility_toggle_public")}
                </span>
              </div>
              {shareIsPublic ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
              ) : null}
            </div>
          </button>
          <button
            type="button"
            disabled={visibilityDisabled}
            onClick={() => void setSharePublic(false)}
            className={cn(
              "flex min-h-[3.75rem] items-center rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
              visibilityDisabled && "cursor-not-allowed opacity-60",
              !shareIsPublic
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:bg-muted/50"
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Lock
                  className={cn(
                    "h-4 w-4 shrink-0",
                    !shareIsPublic ? "text-primary" : "text-muted-foreground"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    !shareIsPublic ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {t("build_settings_visibility_toggle_private")}
                </span>
                {!hasProPlan ? (
                  <Badge
                    variant="secondary"
                    className="shrink-0 border-amber-200/80 bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-50"
                  >
                    {t("build_settings_overview_pro_badge")}
                  </Badge>
                ) : null}
              </div>
              {!shareIsPublic ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
              ) : null}
            </div>
          </button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {shareIsPublic
            ? t("build_settings_overview_visibility_footer_public")
            : t("build_settings_overview_visibility_footer_private")}
        </p>
      </CardContent>
    </Card>
  );

  const hidePref = hideHeaderPref ?? false;
  /** Вкл. = подпись «Сделано на Lemnity» видна (эффективный hide с сервера). */
  const switchChecked = hideHeaderPref === null ? false : !hidePref;
  const showWatermarkOnShare = switchChecked;
  const watermarkSwitchDisabled = !sandboxId || brandingBusy || hideHeaderPref === null;
  const checkoutIsAbsolute = /^https?:\/\//i.test(checkoutHref);

  const overviewWatermarkCard = (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-muted/25 px-4 py-4 sm:px-5">
        <CardTitle className="text-base">{t("build_settings_overview_watermark_title")}</CardTitle>
        <Badge
          className={cn(
            "shrink-0",
            !showWatermarkOnShare
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
              : "border-border bg-muted text-muted-foreground"
          )}
        >
          {showWatermarkOnShare
            ? t("build_settings_overview_watermark_badge_on")
            : t("build_settings_overview_watermark_badge_off")}
        </Badge>
      </CardHeader>
      <CardContent className="px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium leading-snug text-foreground">
              {t("build_settings_watermark_switch_label")}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {hasProPlan
                ? t("build_settings_watermark_switch_help_pro")
                : withPrice(t("build_settings_watermark_switch_help_standard"))}
            </p>
          </div>
          <Switch
            checked={switchChecked}
            disabled={watermarkSwitchDisabled}
            className="mt-0.5 shrink-0"
            onCheckedChange={(v) => {
              if (hasProPlan) {
                void persistHideHeader(!v);
                return;
              }
              if (v) {
                void persistHideHeader(false);
                return;
              }
              if (!shareBrandingRemovalPaid) {
                setPaymentDialogOpen(true);
                return;
              }
              void persistHideHeader(true);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );

  const overviewProjectCard = (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <CardContent className="px-4 py-5 sm:px-5">
        <div className="flex gap-3.5 sm:gap-4">
          {hasProjectName ? (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-sm ring-1 ring-emerald-700/20 sm:h-11 sm:w-11 sm:text-lg"
              aria-hidden
            >
              {titleInitial}
            </span>
          ) : (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/80 text-muted-foreground shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06] sm:h-11 sm:w-11"
              aria-hidden
            >
              <LayoutTemplate className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground sm:text-base">
              {displayTitle}
            </h3>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
              <div className="shrink-0">{statusBadge}</div>
              <span
                className="hidden h-3 w-px shrink-0 bg-border sm:block"
                aria-hidden
              />
              <p className="text-xs leading-snug text-muted-foreground sm:text-[13px]">
                <span className="font-medium text-foreground/80">{t("build_settings_overview_studio_since_label")}</span>{" "}
                {dateLabel}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-1 flex-col gap-0 md:flex-row md:gap-0",
        className
      )}
    >
      <nav
        className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-border bg-muted/40 px-2 py-2 md:w-56 md:flex-col md:gap-1 md:overflow-x-visible md:border-b-0 md:border-r md:bg-muted/30 md:px-3 md:py-4"
        aria-label={t("build_settings_nav_aria")}
      >
        {navItems.map(({ id, labelKey, icon }) => (
          <Button
            key={id}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-auto min-h-10 shrink-0 justify-start gap-3 rounded-lg px-3 py-2.5 text-left font-medium md:w-full",
              section === id
                ? "bg-background text-foreground shadow-sm ring-1 ring-border [&_svg]:text-foreground"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground [&_svg]:opacity-90"
            )}
            onClick={() => setSection(id)}
          >
            <span className="flex shrink-0 items-center justify-center text-[0]">{icon}</span>
            <span className="min-w-0 whitespace-normal text-left text-sm leading-tight">{t(labelKey)}</span>
          </Button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto border-border md:border-l md:bg-background/50">
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-4 md:px-6 md:py-5">
          <h2
            className={cn(
              section === "overview"
                ? "sr-only"
                : "text-lg font-semibold tracking-tight text-foreground md:sr-only"
            )}
          >
            {t(sectionMobileTitle[section])}
          </h2>

          {section === "overview" && (
            <>
              {overviewProjectCard}
              {overviewVisibilityCard}
              {overviewWatermarkCard}
            </>
          )}
          {section === "domains" && domainsPanel}
          {section === "metrica" && metricaPanel}
          {section === "integrations" && integrationsPanel}
        </div>
      </div>
    </div>

    <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("build_settings_watermark_pay_title")}</AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {withPrice(t("build_settings_watermark_pay_desc"))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <AlertDialogCancel className="sm:mt-0">{t("build_settings_watermark_pay_cancel")}</AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            disabled={brandingBusy}
            className="border-border"
            onClick={() => void verifyPaymentAndEnable()}
          >
            {t("build_settings_watermark_pay_verify")}
          </Button>
          {checkoutIsAbsolute ? (
            <AlertDialogAction asChild>
              <a href={checkoutHref} target="_blank" rel="noreferrer">
                {withPrice(t("build_settings_watermark_pay_cta"))}
              </a>
            </AlertDialogAction>
          ) : (
            <AlertDialogAction asChild>
              <Link href={checkoutHref}>{withPrice(t("build_settings_watermark_pay_cta"))}</Link>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
