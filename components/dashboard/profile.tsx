"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Copy, RefreshCw, Check, Eye, EyeOff, Share2, Zap, FolderOpen, Users } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { getStoredUser } from "@/app/(auth)/token-store"
import { SITE_URL } from "@/lib/site"

export function Profile() {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [apiKey] = useState("lmnt_sk_1234567890abcdef...")
  const [userEmail, setUserEmail] = useState<string>("alex@lemnity.com")
  const [refCopied, setRefCopied] = useState(false)

  // demo counters пока без API
  const stats = useMemo(
    () => ({
      projects: 2,
      dailyLimit: 5,
      referrals: 0,
      coinsPerReferral: 50,
      dailyCoinsUsed: 0,
    }),
    [],
  )

  const dailyCoinsLeft = Math.max(0, stats.dailyLimit - stats.dailyCoinsUsed)
  const dailyProgress = stats.dailyLimit === 0 ? 0 : (dailyCoinsLeft / stats.dailyLimit) * 100
  const referralLink = useMemo(() => `${SITE_URL}/?ref=bba1b446`, [])

  useEffect(() => {
    const u = getStoredUser()
    if (u?.email) setUserEmail(u.email)
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText("lmnt_sk_1234567890abcdefghijklmnop")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink)
    setRefCopied(true)
    setTimeout(() => setRefCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-2xl"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("profile_title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("profile_subtitle")}</p>
      </div>

      {/* Avatar Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass mb-6 rounded-2xl p-6"
      >
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border/60">
              <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face" />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-2xl text-white">
                AK
              </AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-transform hover:scale-110">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">Alex Kim</h3>
            <p className="text-muted-foreground">{userEmail}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("profile_member_since")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
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
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.projects}</p>
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
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.dailyLimit}</p>
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
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.referrals}</p>
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
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.coinsPerReferral}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/60 text-foreground">
              <Zap className="h-5 w-5 text-purple-300" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tokens */}
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
          <Button className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
            <Zap className="mr-2 h-4 w-4" />
            {t("profile_upgrade_to_pro")}
          </Button>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("profile_left_today")}</span>
            <span className="text-foreground">
              {dailyCoinsLeft} / {stats.dailyLimit}
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

      {/* Referral */}
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
              {t("profile_referral_desc_prefix")} {stats.coinsPerReferral}{" "}
              {t("profile_referral_desc_suffix")}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {stats.referrals} {t("profile_referral_invited")}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            readOnly
            value={referralLink}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              onClick={copyReferral}
            >
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
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              onClick={() => {
                copyReferral()
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {t("profile_share")}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Profile Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass mb-6 rounded-2xl p-6"
      >
        <h3 className="mb-6 text-lg font-medium text-foreground">
          {t("profile_personal_info")}
        </h3>
        <FieldGroup className="space-y-4">
          <Field>
            <FieldLabel className="text-muted-foreground">{t("profile_field_name")}</FieldLabel>
            <Input
              defaultValue="Alex Kim"
            />
          </Field>
          <Field>
            <FieldLabel className="text-muted-foreground">{t("profile_field_email")}</FieldLabel>
            <Input
              type="email"
              defaultValue={userEmail}
            />
          </Field>
          <Field>
            <FieldLabel className="text-muted-foreground">{t("profile_field_company")}</FieldLabel>
            <Input
              defaultValue="Lemnity Inc."
            />
          </Field>
        </FieldGroup>
        <Button className="mt-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
          {t("profile_save_changes")}
        </Button>
      </motion.div>

      {/* API Keys Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass rounded-2xl p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">{t("profile_api_keys")}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("profile_generate_new_key")}
          </Button>
        </div>

        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <code className="font-mono text-sm text-foreground">
                {showKey ? "lmnt_sk_1234567890abcdefghijklmnop" : apiKey}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="h-4 w-4 text-green-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Copy className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
          <AnimatePresence>
            {copied && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-sm text-green-400"
              >
                {t("profile_copied_to_clipboard")}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {t("profile_api_key_security_note")}
        </p>
      </motion.div>
    </motion.div>
  )
}
