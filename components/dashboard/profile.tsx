"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Camera,
  Copy,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
  Share2,
  Zap,
  FolderOpen,
  Users,
  BadgeCheck,
  Download
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { useI18n } from "@/components/i18n-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SITE_URL } from "@/lib/site"

type ProfileApiUser = {
  id: string
  email: string
  name: string | null
  company: string | null
  avatar: string | null
  apiKey: string | null
  tokenBalance: number
  tokenLimit: number
  referralCode: string
  referralCount: number
  referralRewardPerSignup: number
  isPartner: boolean
  partnerApprovedAt: string | null
  projectsCount: number
  tokensUsedToday: number
}

type WalletApiResponse = {
  partner: {
    isPartner: boolean
    approvedAt: string | null
  }
  wallet: {
    displayCurrency: "RUB" | "USD" | "TJS"
    availableDisplayMinor: number
    availableDisplayFormatted: string
    availableByCurrency: {
      RUB: number
      USD: number
      TJS: number
    }
  }
  recentEarnings: Array<{
    id: string
    referredUserEmail: string | null
    rewardDisplayMinor: number
    createdAt: string
  }>
  withdrawals: Array<{
    id: string
    amountDisplayMinor: number
    status: string
    createdAt: string
  }>
}

export function Profile() {
  const { t, lang } = useI18n()
  const { data: session, update } = useSession()

  const [profile, setProfile] = useState<ProfileApiUser | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [refCopied, setRefCopied] = useState(false)
  const [formName, setFormName] = useState("")
  const [formCompany, setFormCompany] = useState("")
  const [walletData, setWalletData] = useState<WalletApiResponse | null>(null)
  const [isLoadingWallet, setIsLoadingWallet] = useState(true)
  const [isCreatingWithdrawal, setIsCreatingWithdrawal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawDetails, setWithdrawDetails] = useState("")

  const numberLocale = lang === "en" ? "en-US" : lang === "tg" ? "tg-TJ" : "ru-RU"

  async function loadReferralWallet(currentLang: "ru" | "en" | "tg") {
    try {
      const res = await fetch(`/api/referrals/wallet?lang=${currentLang}`, {
        credentials: "include"
      })
      if (!res.ok) return
      const data = (await res.json()) as WalletApiResponse
      setWalletData(data)
    } catch {
      // ignore
    } finally {
      setIsLoadingWallet(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/profile", { credentials: "include" })
        if (!res.ok) return
        const data = (await res.json()) as { user?: ProfileApiUser }
        if (!mounted || !data.user) return
        setProfile(data.user)
        setFormName(data.user.name ?? "")
        setFormCompany(data.user.company ?? "")
      } catch {
        // ignore
      } finally {
        if (mounted) setIsLoadingProfile(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setIsLoadingWallet(true)
    void loadReferralWallet(lang)
    // lang switch should re-fetch wallet in local currency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const userEmail = profile?.email ?? session?.user?.email ?? ""
  const userName = profile?.name ?? session?.user?.name ?? "User"
  const userCompany = profile?.company ?? ""
  const avatarUrl = profile?.avatar ?? undefined
  const apiKey = profile?.apiKey ?? ""
  const referralLink = profile?.referralCode
    ? `${SITE_URL}/?ref=${encodeURIComponent(profile.referralCode)}`
    : `${SITE_URL}/`

  const stats = useMemo(() => {
    const tokenLimit = profile?.tokenLimit ?? 0
    const dailyLimit = Math.max(1, Math.floor(tokenLimit / 30))
    const dailyCoinsUsed = Math.min(dailyLimit, profile?.tokensUsedToday ?? 0)
    return {
      projects: profile?.projectsCount ?? 0,
      dailyLimit,
      referrals: profile?.referralCount ?? 0,
      coinsPerReferral: profile?.referralRewardPerSignup ?? 50,
      dailyCoinsUsed
    }
  }, [profile?.projectsCount, profile?.tokenLimit, profile?.tokensUsedToday, profile?.referralCount, profile?.referralRewardPerSignup])

  const dailyCoinsLeft = Math.max(0, stats.dailyLimit - stats.dailyCoinsUsed)
  const dailyProgress = stats.dailyLimit === 0 ? 0 : (dailyCoinsLeft / stats.dailyLimit) * 100

  const maskedApiKey = useMemo(() => {
    if (!apiKey) return "—"
    if (showKey) return apiKey
    if (apiKey.length <= 16) return `${apiKey.slice(0, 8)}...`
    return `${apiKey.slice(0, 12)}...`
  }, [apiKey, showKey])

  const isFormDirty =
    (formName.trim() !== (profile?.name ?? "").trim()) ||
    (formCompany.trim() !== userCompany.trim())

  function copyApiKey() {
    if (!apiKey) return
    void navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyReferral() {
    void navigator.clipboard.writeText(referralLink)
    setRefCopied(true)
    setTimeout(() => setRefCopied(false), 2000)
  }

  async function createWithdrawalRequest() {
    const amount = Number(withdrawAmount.replace(",", "."))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("profile_withdraw_invalid_amount"))
      return
    }
    if (!profile?.isPartner) {
      toast.message(t("profile_partner_required_hint"))
      return
    }
    setIsCreatingWithdrawal(true)
    try {
      const res = await fetch("/api/referrals/withdrawals", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount,
          details: withdrawDetails.trim() || null,
          currency: walletData?.wallet.displayCurrency,
          lang
        })
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "withdraw_failed")
      }
      setWithdrawAmount("")
      setWithdrawDetails("")
      toast.success(t("profile_withdraw_created"))
      await loadReferralWallet(lang)
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("partner")
          ? t("profile_partner_required_hint")
          : t("retry")
      toast.error(message)
    } finally {
      setIsCreatingWithdrawal(false)
    }
  }

  async function saveProfile() {
    if (!profile || !isFormDirty || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formName.trim() || null,
          company: formCompany.trim() || null
        })
      })
      if (!res.ok) {
        throw new Error("save_failed")
      }
      const data = (await res.json()) as {
        user?: { name?: string | null; company?: string | null; avatar?: string | null; email?: string }
      }
      const nextName = data.user?.name ?? (formName.trim() || null)
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: nextName,
              company: data.user?.company ?? (formCompany.trim() || null),
              avatar: data.user?.avatar ?? prev.avatar,
              email: data.user?.email ?? prev.email
            }
          : prev
      )
      await update({ name: nextName ?? undefined })
    } catch {
      toast.error(t("retry"))
    } finally {
      setIsSaving(false)
    }
  }

  async function generateApiKey() {
    if (isGeneratingKey) return
    setIsGeneratingKey(true)
    try {
      const res = await fetch("/api/profile?action=generate-api-key", {
        method: "POST",
        credentials: "include"
      })
      if (!res.ok) {
        throw new Error("generate_key_failed")
      }
      const data = (await res.json()) as { apiKey?: string }
      const nextApiKey = data.apiKey ?? null
      if (nextApiKey) {
        setProfile((prev) => (prev ? { ...prev, apiKey: nextApiKey } : prev))
        setShowKey(true)
      }
    } catch {
      toast.error(t("retry"))
    } finally {
      setIsGeneratingKey(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-2xl"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("profile_title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("profile_subtitle")}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass mb-6 rounded-2xl p-6"
      >
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border/60">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-2xl text-white">
                {(userName || userEmail)
                  .split(" ")
                  .filter(Boolean)
                  .map((chunk) => chunk[0]?.toUpperCase())
                  .join("")
                  .slice(0, 2) || "L"}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-transform hover:scale-110"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">{isLoadingProfile ? t("loading") : userName}</h3>
            <p className="text-muted-foreground">{userEmail}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">{t("profile_member_since")}</p>
              {profile?.isPartner ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {t("profile_partner_badge")}
                </span>
              ) : (
                <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                  {t("profile_partner_inactive")}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t("profile_stats_projects")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.projects.toLocaleString(numberLocale)}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/60 text-foreground">
              <FolderOpen className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t("profile_stats_daily_limit")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.dailyLimit.toLocaleString(numberLocale)}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/60 text-foreground">
              <Zap className="h-5 w-5 text-yellow-300" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t("profile_stats_referrals")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.referrals.toLocaleString(numberLocale)}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/60 text-foreground">
              <Users className="h-5 w-5 text-emerald-300" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t("profile_stats_coins_per_ref")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.coinsPerReferral.toLocaleString(numberLocale)}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/60 text-foreground">
              <Zap className="h-5 w-5 text-purple-300" />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="glass mb-6 rounded-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-foreground">{t("profile_coins_title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("profile_coins_subtitle")}</p>
          </div>
          <Button
            type="button"
            className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/pricing"
            }}
          >
            <Zap className="mr-2 h-4 w-4" />
            {t("profile_upgrade_to_pro")}
          </Button>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("profile_left_today")}</span>
            <span className="text-foreground">
              {dailyCoinsLeft.toLocaleString(numberLocale)} / {stats.dailyLimit.toLocaleString(numberLocale)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${dailyProgress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("profile_refresh_at_midnight")}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass mb-6 rounded-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-foreground">{t("profile_referral_title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("profile_referral_desc_prefix")} {stats.coinsPerReferral.toLocaleString(numberLocale)}{" "}
              {t("profile_referral_desc_suffix")}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {stats.referrals.toLocaleString(numberLocale)} {t("profile_referral_invited")}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input readOnly value={referralLink} className="font-mono text-sm" />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="rounded-xl" onClick={copyReferral}>
              <AnimatePresence mode="wait">
                {refCopied ? (
                  <motion.span
                    key="ok"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="inline-flex items-center gap-2"
                  >
                    <Check className="h-4 w-4 text-emerald-300" /> {t("profile_copied")}
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="inline-flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" /> {t("profile_copy")}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
            <Button type="button" variant="secondary" className="rounded-xl" onClick={copyReferral}>
              <Share2 className="mr-2 h-4 w-4" />
              {t("profile_share")}
            </Button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("profile_referral_wallet_title")}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {isLoadingWallet
                  ? t("loading")
                  : (walletData?.wallet.availableDisplayFormatted ?? `0 ${walletData?.wallet.displayCurrency ?? "RUB"}`)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {walletData?.wallet.displayCurrency ? t("profile_referral_wallet_currency") : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className={!profile?.isPartner ? "opacity-60" : ""}
              onClick={() => {
                if (!profile?.isPartner) {
                  toast.message(t("profile_partner_required_hint"))
                  return
                }
                void createWithdrawalRequest()
              }}
              disabled={isCreatingWithdrawal}
            >
              <Download className="mr-2 h-4 w-4" />
              {isCreatingWithdrawal ? t("loading") : t("profile_withdraw_button")}
            </Button>
          </div>
          {!profile?.isPartner ? (
            <p className="mt-2 text-xs text-muted-foreground">{t("profile_partner_required_hint")}</p>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground" htmlFor="withdraw-amount">
                {t("profile_withdraw_amount_label")}
              </label>
              <Input
                id="withdraw-amount"
                inputMode="decimal"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder={t("profile_withdraw_amount_placeholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground" htmlFor="withdraw-details">
                {t("profile_withdraw_details_label")}
              </label>
              <Textarea
                id="withdraw-details"
                value={withdrawDetails}
                onChange={(event) => setWithdrawDetails(event.target.value)}
                placeholder={t("profile_withdraw_details_placeholder")}
                className="min-h-[40px]"
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs text-muted-foreground">{t("profile_referral_recent_earnings")}</p>
            <div className="space-y-1 text-sm">
              {(walletData?.recentEarnings.slice(0, 3) ?? []).map((earning) => (
                <div key={earning.id} className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
                  <span className="truncate text-muted-foreground">{earning.referredUserEmail ?? "user"}</span>
                  <span className="font-medium text-foreground">
                    +{(earning.rewardDisplayMinor / 100).toLocaleString(numberLocale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {!walletData?.recentEarnings?.length ? (
                <p className="text-xs text-muted-foreground">{t("profile_referral_recent_empty")}</p>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass mb-6 rounded-2xl p-6"
      >
        <h3 className="mb-6 text-lg font-medium text-foreground">{t("profile_personal_info")}</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="profile-name">
              {t("profile_field_name")}
            </label>
            <Input id="profile-name" value={formName} onChange={(event) => setFormName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="profile-email">
              {t("profile_field_email")}
            </label>
            <Input id="profile-email" type="email" value={userEmail} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="profile-company">
              {t("profile_field_company")}
            </label>
            <Input id="profile-company" value={formCompany} onChange={(event) => setFormCompany(event.target.value)} />
          </div>
        </div>
        <Button
          type="button"
          className="mt-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          onClick={saveProfile}
          disabled={!isFormDirty || isSaving}
        >
          {isSaving ? t("loading") : t("profile_save_changes")}
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass rounded-2xl p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">{t("profile_api_keys")}</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={generateApiKey}
            disabled={isGeneratingKey}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isGeneratingKey ? t("loading") : t("profile_generate_new_key")}
          </Button>
        </div>

        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <code className="block truncate font-mono text-sm text-foreground">{maskedApiKey}</code>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey((prev) => !prev)}
                disabled={!apiKey}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={copyApiKey}
                disabled={!apiKey}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check className="h-4 w-4 text-green-400" />
                    </motion.div>
                  ) : (
                    <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Copy className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
          <AnimatePresence>
            {copied ? (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-sm text-green-400"
              >
                {t("profile_copied_to_clipboard")}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{t("profile_api_key_security_note")}</p>
      </motion.div>
    </motion.div>
  )
}
