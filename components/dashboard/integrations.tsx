"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Settings } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

const integrations = [
  {
    id: "github",
    name: "GitHub",
    descriptionKey: "integration_github_desc",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    connected: true,
  },
  {
    id: "vercel",
    name: "Vercel",
    descriptionKey: "integration_vercel_desc",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 22.525H0l12-21.05 12 21.05z" />
      </svg>
    ),
    connected: true,
  },
  {
    id: "supabase",
    name: "Supabase",
    descriptionKey: "integration_supabase_desc",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.424l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.261.401-.562a1.04 1.04 0 0 0-.836-1.66z" />
      </svg>
    ),
    connected: false,
  },
  {
    id: "stripe",
    name: "Stripe",
    descriptionKey: "integration_stripe_desc",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
      </svg>
    ),
    connected: false,
  },
  {
    id: "telegram",
    name: "Telegram",
    descriptionKey: "integration_telegram_desc",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    connected: false,
  },
  {
    id: "yandex-metrika",
    nameKey: "integration_yam_name",
    descriptionKey: "integration_yam_desc",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12S6.2 22.5 12 22.5 22.5 17.8 22.5 12 17.8 1.5 12 1.5Zm0 2.2a8.3 8.3 0 1 1 0 16.6 8.3 8.3 0 0 1 0-16.6Z" />
        <path d="M12.1 6.2c-.7 0-1.3.6-1.3 1.3v4.2l-2.7 3.6c-.4.6-.3 1.4.3 1.8.6.4 1.4.3 1.8-.3l3-4c.2-.2.3-.5.3-.8V7.5c0-.7-.6-1.3-1.4-1.3Z" />
      </svg>
    ),
    connected: false,
  },
]

export function Integrations() {
  const { t } = useI18n()
  const ymEnabledByEnv = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID
    return !!raw && Number.isFinite(Number(raw))
  }, [])

  const [connections, setConnections] = useState<Record<string, boolean>>(() =>
    integrations.reduce((acc, int) => {
      const connected = int.id === "yandex-metrika" ? ymEnabledByEnv : int.connected
      return { ...acc, [int.id]: connected }
    }, {})
  )

  const toggleConnection = (id: string) => {
    setConnections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("integrations_title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("integrations_subtitle")}
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrations.map((integration, index) => (
          <motion.div
            key={integration.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ y: -2 }}
            className="glass glass-hover flex items-center justify-between rounded-2xl p-5 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/60 text-foreground">
                {integration.icon}
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {"nameKey" in integration ? t((integration as any).nameKey) : integration.name}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t(integration.descriptionKey as any)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={connections[integration.id]}
                onCheckedChange={() => toggleConnection(integration.id)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass mt-8 rounded-2xl p-6 text-center"
      >
        <p className="text-muted-foreground">
          {t("integrations_soon")}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("integrations_metrika_hint")}
        </p>
      </motion.div>
    </motion.div>
  )
}
