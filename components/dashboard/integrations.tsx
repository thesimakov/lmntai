"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ClipboardList, ExternalLink, Settings, Sparkles, Table2, Users, Zap } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { useI18n } from "@/components/i18n-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { MessageKey, UiLanguage } from "@/lib/i18n"
import {
  INTEGRATION_SETTINGS_STORAGE_KEY,
  readStoredIntegrationSettings,
  readStoredIntegrationConnections,
  writeStoredIntegrationConnections
} from "@/lib/studio-integration-storage"

type IntegrationItem =
  | {
      id: string
      name: string
      descriptionKey: MessageKey
      icon: ReactNode
      connected: boolean
    }
  | {
      id: string
      nameKey: MessageKey
      descriptionKey: MessageKey
      icon: ReactNode
      connected: boolean
    }

type IntegrationSettingsField = {
  key: string
  label: string
  placeholder: string
  help: string
  inputType?: "text" | "password"
}

type IntegrationSettingsConfig = {
  title: string
  description: string
  docsUrl: string
  fields: IntegrationSettingsField[]
}

const integrations: IntegrationItem[] = [
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
    id: "web-forms",
    nameKey: "integration_forms_name",
    descriptionKey: "integration_forms_desc",
    icon: <ClipboardList className="h-6 w-6" aria-hidden />,
    connected: false,
  },
  {
    id: "spreadsheets",
    nameKey: "integration_tables_name",
    descriptionKey: "integration_tables_desc",
    icon: <Table2 className="h-6 w-6" aria-hidden />,
    connected: false,
  },
  {
    id: "crm",
    nameKey: "integration_crm_name",
    descriptionKey: "integration_crm_desc",
    icon: <Users className="h-6 w-6" aria-hidden />,
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

// Temporary hide requested integrations from UI.
const TEMP_HIDDEN_INTEGRATION_IDS = new Set(["vercel", "supabase", "stripe"])

const WIDGET_BUILDER_URL = "https://app.lemnity.ru"
const DEFAULT_WIDGET_SCRIPT = `<script
  async
  src="https://app.lemnity.ru/widgets/embed.js"
  data-lmnt-widget="YOUR_WIDGET_ID"
></script>`
const PRO_REQUIRED_INTEGRATION_IDS = new Set([
  "telegram",
  "yandex-metrika",
  "web-forms",
  "spreadsheets",
  "crm",
])

function ymEnabledFromEnv(): boolean {
  const raw = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID
  return !!raw && Number.isFinite(Number(raw))
}

function buildSettingsConfig(lang: UiLanguage): Record<string, IntegrationSettingsConfig> {
  if (lang === "en") {
    return {
      github: {
        title: "GitHub integration settings",
        description: "Connect repository access for deploy workflow.",
        docsUrl: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
        fields: [
          {
            key: "owner",
            label: "Repository owner",
            placeholder: "your-org-or-username",
            help: "GitHub org/user that owns the repository."
          },
          {
            key: "repo",
            label: "Repository name",
            placeholder: "project-repo",
            help: "Repository name where generated project is published."
          },
          {
            key: "branch",
            label: "Deploy branch",
            placeholder: "gh-pages",
            help: "Branch used for Pages/preview deploy."
          },
          {
            key: "token",
            label: "Personal access token",
            placeholder: "ghp_xxxxxxxxxxxxx",
            help: "Use PAT with at least repo/workflow permissions.",
            inputType: "password"
          }
        ]
      },
      telegram: {
        title: "Telegram integration settings",
        description: "Notifications and bot messaging settings.",
        docsUrl: "https://core.telegram.org/bots#6-botfather",
        fields: [
          {
            key: "botToken",
            label: "Bot token",
            placeholder: "123456789:AA...",
            help: "Create bot via @BotFather and paste token here.",
            inputType: "password"
          },
          {
            key: "chatId",
            label: "Chat ID",
            placeholder: "-1001234567890",
            help: "Target group/channel/user chat id for notifications."
          }
        ]
      },
      "web-forms": {
        title: "Lead capture webhook",
        description: "Incoming form POST target (HTTPS); use your API, Zapier, or Make.",
        docsUrl: "https://zapier.com/apps/webhooks/integrations",
        fields: [
          {
            key: "webhookUrl",
            label: "Webhook URL",
            placeholder: "https://hooks.zapier.com/…",
            help: "JSON body with submitted fields.",
            inputType: "password"
          },
          {
            key: "formLabel",
            label: "Form label (optional)",
            placeholder: "Contact · landing hero",
            help: "For your dashboards and filters."
          }
        ]
      },
      spreadsheets: {
        title: "Spreadsheet connector",
        description: "Targets for sync or export workflows (e.g. via Zapier/Make).",
        docsUrl: "https://developers.google.com/sheets/api/guides/concepts",
        fields: [
          {
            key: "spreadsheetUrl",
            label: "Sheet URL or ID",
            placeholder: "https://docs.google.com/spreadsheets/d/…",
            help: "Google Sheets link or workbook identifier."
          },
          {
            key: "sheetTab",
            label: "Tab name (optional)",
            placeholder: "Leads",
            help: "Target sheet tab when appending rows."
          }
        ]
      },
      crm: {
        title: "CRM webhook",
        description: "Inbound URL for amoCRM / Bitrix24-style automations.",
        docsUrl: "https://www.amocrm.ru/developers/content/oauth/step-by-step",
        fields: [
          {
            key: "webhookInbound",
            label: "Inbound webhook URL",
            placeholder: "https://…",
            help: "URL your CRM or middleware exposes for lead intake.",
            inputType: "password"
          },
          {
            key: "pipelineHint",
            label: "Pipeline notes (optional)",
            placeholder: "Main funnel · new lead",
            help: "Local reminder only."
          }
        ]
      },
      "yandex-metrika": {
        title: "Yandex Metrika settings",
        description: "Counter for visit/event/webvisor analytics.",
        docsUrl: "https://yandex.com/support/metrica/general/counter-code.html",
        fields: [
          {
            key: "counterId",
            label: "Counter ID",
            placeholder: "12345678",
            help: "Use the numeric counter id (NEXT_PUBLIC_YANDEX_METRIKA_ID)."
          }
        ]
      }
    }
  }

  if (lang === "tg") {
    return {
      github: {
        title: "Танзимоти интегратсияи GitHub",
        description: "Дастрасӣ ба репозиторий барои деплой пайваст кунед.",
        docsUrl: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
        fields: [
          {
            key: "owner",
            label: "Соҳиби репозиторий",
            placeholder: "org-ё-user",
            help: "Ташкилот ё корбари GitHub, ки соҳиби репозиторий аст."
          },
          {
            key: "repo",
            label: "Номи репозиторий",
            placeholder: "project-repo",
            help: "Номи репозиторий барои нашри лоиҳа."
          },
          {
            key: "branch",
            label: "Шохаи деплой",
            placeholder: "gh-pages",
            help: "Шоха барои Pages/preview."
          },
          {
            key: "token",
            label: "Токени дастрасӣ (PAT)",
            placeholder: "ghp_xxxxxxxxxxxxx",
            help: "PAT бо дастрасии repo/workflow лозим аст.",
            inputType: "password"
          }
        ]
      },
      telegram: {
        title: "Танзимоти интегратсияи Telegram",
        description: "Танзими огоҳинома ва паёмҳои бот.",
        docsUrl: "https://core.telegram.org/bots#6-botfather",
        fields: [
          {
            key: "botToken",
            label: "Токени бот",
            placeholder: "123456789:AA...",
            help: "Ботро дар @BotFather созед ва токенро гузоред.",
            inputType: "password"
          },
          {
            key: "chatId",
            label: "Chat ID",
            placeholder: "-1001234567890",
            help: "ID-и чат/канал/гурӯҳ барои огоҳиномаҳо."
          }
        ]
      },
      "web-forms": {
        title: "Webhook барои шаклҳо",
        description: "POST ба HTTPS; бэкенд, Zapier ё Make.",
        docsUrl: "https://zapier.com/apps/webhooks/integrations",
        fields: [
          {
            key: "webhookUrl",
            label: "URL-и webhook",
            placeholder: "https://hooks.zapier.com/…",
            help: "ҷисми JSON бо майдонҳо.",
            inputType: "password"
          },
          {
            key: "formLabel",
            label: "Номи шакл (ихтиёрӣ)",
            placeholder: "Хабрасонӣ · hero",
            help: "Барои филтр дар панел."
          }
        ]
      },
      spreadsheets: {
        title: "Ҷадвал",
        description: "Ҳадаф барои синк ё экспорт (масалан Zapier).",
        docsUrl: "https://developers.google.com/sheets/api/guides/concepts",
        fields: [
          {
            key: "spreadsheetUrl",
            label: "Пайванд ё ID",
            placeholder: "https://docs.google.com/…",
            help: "Google Sheets ё санҷиши файл."
          },
          {
            key: "sheetTab",
            label: "Лист",
            placeholder: "Лидҳо",
            help: "Номи барга барои навиштан."
          }
        ]
      },
      crm: {
        title: "CRM webhook",
        description: "AmoCRM, Bitrix ё миёнагар.",
        docsUrl: "https://www.amocrm.ru/developers/content/oauth/step-by-step",
        fields: [
          {
            key: "webhookInbound",
            label: "Webhook-и даромад",
            placeholder: "https://…",
            help: "URL аз ҷониби CRM ё миёнагар.",
            inputType: "password"
          },
          {
            key: "pipelineHint",
            label: "Қайдҳо",
            placeholder: "",
            help: "Танҳо дар браузер."
          }
        ]
      },
      "yandex-metrika": {
        title: "Танзимоти Yandex Metrika",
        description: "Счётчик барои аналитикаи боздид ва рӯйдодҳо.",
        docsUrl: "https://yandex.com/support/metrica/general/counter-code.html",
        fields: [
          {
            key: "counterId",
            label: "ID-и счётчик",
            placeholder: "12345678",
            help: "ID-и рақамӣ (NEXT_PUBLIC_YANDEX_METRIKA_ID) ворид кунед."
          }
        ]
      }
    }
  }

  return {
    github: {
      title: "Настройки интеграции GitHub",
      description: "Подключите доступ к репозиторию для деплой-цепочки.",
      docsUrl: "https://docs.github.com/ru/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
      fields: [
        {
          key: "owner",
          label: "Владелец репозитория",
          placeholder: "org-или-username",
          help: "Организация или пользователь GitHub, владеющий репозиторием."
        },
        {
          key: "repo",
          label: "Название репозитория",
          placeholder: "project-repo",
          help: "Куда публиковать сгенерированный проект."
        },
        {
          key: "branch",
          label: "Ветка деплоя",
          placeholder: "gh-pages",
          help: "Ветка для Pages/preview деплоя."
        },
        {
          key: "token",
          label: "Персональный токен (PAT)",
          placeholder: "ghp_xxxxxxxxxxxxx",
          help: "Нужен PAT с правами минимум repo/workflow.",
          inputType: "password"
        }
      ]
    },
    telegram: {
      title: "Настройки интеграции Telegram",
      description: "Уведомления и бот-интеграция.",
      docsUrl: "https://core.telegram.org/bots#6-botfather",
      fields: [
        {
          key: "botToken",
          label: "Токен бота",
          placeholder: "123456789:AA...",
          help: "Создайте бота через @BotFather и вставьте токен.",
          inputType: "password"
        },
        {
          key: "chatId",
          label: "ID чата",
          placeholder: "-1001234567890",
          help: "ID группы/канала/пользователя для уведомлений."
        }
      ]
    },
    "web-forms": {
      title: "Формы и заявки",
      description: "Webhook для приёма данных (HTTPS); ваш бэкенд, Zapier или Make.",
      docsUrl: "https://zapier.com/apps/webhooks/integrations",
      fields: [
        {
          key: "webhookUrl",
          label: "URL webhook",
          placeholder: "https://hooks.zapier.com/hooks/catch/…",
          help: "POST с JSON-телом полей формы.",
          inputType: "password"
        },
        {
          key: "formLabel",
          label: "Имя формы (необязательно)",
          placeholder: "Заявка с лендинга",
          help: "Метка для ваших сценариев."
        }
      ]
    },
    spreadsheets: {
      title: "Таблицы",
      description: "Ссылка или ID для синхронизации и экспорта (часто через Zapier/Make).",
      docsUrl: "https://developers.google.com/sheets/api/guides/concepts",
      fields: [
        {
          key: "spreadsheetUrl",
          label: "Таблица (ссылка или ID)",
          placeholder: "https://docs.google.com/spreadsheets/d/…",
          help: "Google Sheets или идентификатор книги Excel/OneDrive в вашей связке."
        },
        {
          key: "sheetTab",
          label: "Имя листа",
          placeholder: "Заявки",
          help: "Куда добавлять строки."
        }
      ]
    },
    crm: {
      title: "CRM",
      description: "Входящий webhook для amoCRM, Битрикс24 или посредника.",
      docsUrl: "https://www.amocrm.ru/developers/content/oauth/step-by-step",
      fields: [
        {
          key: "webhookInbound",
          label: "Входящий webhook",
          placeholder: "https://…",
          help: "URL, который генерирует CRM или промежуточный сервис.",
          inputType: "password"
        },
        {
          key: "pipelineHint",
          label: "Воронка и заметки",
          placeholder: "«Продажи», статус Новая заявка",
          help: "Только локальная памятка в браузере."
        }
      ]
    },
    "yandex-metrika": {
      title: "Настройки Яндекс Метрики",
      description: "Счетчик аналитики визитов, событий и webvisor.",
      docsUrl: "https://yandex.ru/support/metrica/general/counter-code.html",
      fields: [
        {
          key: "counterId",
          label: "ID счетчика",
          placeholder: "12345678",
          help: "Укажите числовой ID счетчика (NEXT_PUBLIC_YANDEX_METRIKA_ID)."
        }
      ]
    }
  }
}

export type IntegrationsProps = {
  /** Встроенный вид (настройки студии): те же данные и localStorage, что и в /integrations */
  embedded?: boolean
  /** Показать только перечисленные интеграции (по id). */
  integrationIdsFilter?: string[]
  /** Исключить id из списка (дополнительно к скрытым по умолчанию). */
  integrationIdsOmit?: string[]
  /** Баннер виджетов Lemnity (по умолчанию для embedded — показывается). */
  showWidgetsBanner?: boolean
  /** Нижний блок «скоро»; по умолчанию скрыт в узком режиме `integrationIdsFilter`. */
  showComingSoonFooter?: boolean
  /** Заголовок и ссылка в кабинет (для embedded). */
  showPageIntro?: boolean
  /** Шапка «Подключите внешние сервисы» + CTA Pro (настройки студии). */
  studioEmbeddedHero?: boolean
}

export function Integrations({
  embedded = false,
  integrationIdsFilter,
  integrationIdsOmit,
  showWidgetsBanner: showWidgetsBannerProp,
  showComingSoonFooter: showComingSoonFooterProp,
  showPageIntro: showPageIntroProp,
  studioEmbeddedHero = false
}: IntegrationsProps) {
  const { t, lang } = useI18n()
  const { data: session } = useSession()
  const showWidgetsBanner = showWidgetsBannerProp !== false
  const showComingSoonFooter =
    showComingSoonFooterProp !== undefined
      ? showComingSoonFooterProp
      : !integrationIdsFilter?.length
  const showPageIntro = showPageIntroProp !== false

  const visibleIntegrations = useMemo(() => {
    let list = integrations.filter((integration) => !TEMP_HIDDEN_INTEGRATION_IDS.has(integration.id))
    if (integrationIdsFilter?.length) {
      const allow = new Set(integrationIdsFilter)
      list = list.filter((integration) => allow.has(integration.id))
    }
    if (integrationIdsOmit?.length) {
      const omit = new Set(integrationIdsOmit)
      list = list.filter((integration) => !omit.has(integration.id))
    }
    return list
  }, [integrationIdsFilter, integrationIdsOmit])
  const settingsConfig = useMemo(() => buildSettingsConfig(lang), [lang])
  const rawPlanUpper = String(session?.user?.plan ?? "").toUpperCase()
  const hasProAccess =
    rawPlanUpper === "PRO" || rawPlanUpper === "TEAM" || rawPlanUpper === "BUSINESS"

  const [connections, setConnections] = useState<Record<string, boolean>>(() => {
    const stored = readStoredIntegrationConnections()
    const base = integrations.reduce(
      (acc, int) => {
        const connected = int.id === "yandex-metrika" ? ymEnabledFromEnv() : int.connected
        return { ...acc, [int.id]: connected }
      },
      {} as Record<string, boolean>
    )
    return { ...base, ...stored }
  })
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null)
  const [integrationSettings, setIntegrationSettings] = useState<Record<string, Record<string, string>>>(() =>
    readStoredIntegrationSettings()
  )
  const [widgetEnabled, setWidgetEnabled] = useState(false)
  const [widgetScriptOpen, setWidgetScriptOpen] = useState(false)
  const [widgetScript, setWidgetScript] = useState(DEFAULT_WIDGET_SCRIPT)

  const toggleConnection = (id: string) => {
    setConnections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(
        INTEGRATION_SETTINGS_STORAGE_KEY,
        JSON.stringify(integrationSettings)
      )
    } catch {
      // ignore
    }
  }, [integrationSettings])

  useEffect(() => {
    if (typeof window === "undefined") return
    writeStoredIntegrationConnections(connections)
  }, [connections])

  useEffect(() => {
    const counterId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID
    if (!counterId) return
    setIntegrationSettings((prev) => {
      const current = prev["yandex-metrika"]?.counterId?.trim()
      if (current) return prev
      return {
        ...prev,
        "yandex-metrika": {
          ...prev["yandex-metrika"],
          counterId
        }
      }
    })
  }, [])

  function openPricing() {
    if (typeof window === "undefined") return
    window.location.href = "/pricing"
  }

  function openWidgetBuilder() {
    if (typeof window === "undefined") return
    window.open(WIDGET_BUILDER_URL, "_blank", "noopener,noreferrer")
  }

  function onWidgetEnabledChange(next: boolean) {
    setWidgetEnabled(next)
    if (next) {
      openWidgetBuilder()
    }
  }

  async function copyWidgetScript() {
    try {
      await navigator.clipboard.writeText(widgetScript.trim())
      toast.success(t("integrations_widgets_script_copied"))
    } catch {
      toast.error(t("playground_toast_copy_failed"))
    }
  }

  function updateIntegrationField(
    integrationId: string,
    fieldKey: string,
    value: string
  ) {
    setIntegrationSettings((prev) => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        [fieldKey]: value
      }
    }))
  }

  function saveIntegrationSettings(integrationId: string) {
    const values = integrationSettings[integrationId] ?? {}
    const hasValue = Object.values(values).some((v) => String(v ?? "").trim().length > 0)
    if (!hasValue) {
      toast.error(lang === "en" ? "Fill at least one field." : lang === "tg" ? "Ақаллан як майдонро пур кунед." : "Заполните хотя бы одно поле.")
      return
    }
    toast.success(
      lang === "en"
        ? "Settings saved locally."
        : lang === "tg"
          ? "Танзимот дар браузер нигоҳ дошта шуд."
          : "Настройки сохранены локально в браузере."
    )
  }

  const studioEmbeddedHeroBlock =
    embedded && studioEmbeddedHero ? (
      <Card className="mb-4 gap-0 overflow-hidden border-border py-0 shadow-sm">
        <CardContent className="space-y-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {t("integrations_studio_connect_title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("integrations_studio_connect_subtitle")}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 gap-2 rounded-full bg-violet-600 px-4 text-white shadow-sm hover:bg-violet-700"
              onClick={openPricing}
            >
              <Zap className="h-4 w-4 shrink-0" aria-hidden />
              {t("integrations_studio_upgrade_pro")}
            </Button>
          </div>
        </CardContent>
      </Card>
    ) : null

  const studioEmbeddedFootnote =
    embedded && studioEmbeddedHero ? (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>
          {lang === "en"
            ? "Values are stored in this browser (localStorage). Server intake uses your webhook or Zapier/Make."
            : lang === "tg"
              ? "Қиматҳо дар ин браузер (localStorage) нигоҳ дошта мешаванд."
              : "Значения хранятся в этом браузере (localStorage). Приём на сервере — через webhook или Zapier/Make."}
        </span>
        <Button variant="link" className="h-auto p-0 text-xs font-medium" asChild>
          <Link href="/integrations">{t("build_settings_integrations_open_dashboard")}</Link>
        </Button>
      </div>
    ) : null

  const pageIntro = embedded ? (
    <div className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{t("integrations_title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("integrations_subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 rounded-lg" asChild>
          <Link href="/integrations">{t("build_settings_integrations_open_dashboard")}</Link>
        </Button>
      </div>
    </div>
  ) : (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-foreground">{t("integrations_title")}</h1>
      <p className="mt-1 text-muted-foreground">{t("integrations_subtitle")}</p>
    </div>
  )

  const inner = (
    <>
      {studioEmbeddedHeroBlock}
      {showPageIntro ? pageIntro : null}

      {showWidgetsBanner ? (
      <motion.div
        initial={embedded ? false : { opacity: 0, y: 20 }}
        animate={embedded ? undefined : { opacity: 1, y: 0 }}
        transition={embedded ? undefined : { duration: 0.4 }}
        className={
          embedded
            ? "mb-4 rounded-2xl border border-primary/20 bg-card/40 p-5 backdrop-blur-sm"
            : "glass mb-6 rounded-2xl border border-primary/20 p-5"
        }
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">{t("integrations_widgets_title")}</h2>
              <p className="text-sm font-medium text-foreground/90">{t("integrations_widgets_subtitle")}</p>
              <p className="text-sm text-muted-foreground">{t("integrations_widgets_description")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={widgetEnabled} onCheckedChange={onWidgetEnabledChange} />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label={t("integrations_widgets_script_toggle_aria")}
              onClick={() => setWidgetScriptOpen((prev) => !prev)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={openWidgetBuilder} className="rounded-xl">
            {t("integrations_widgets_open_builder")}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {widgetEnabled
              ? t("integrations_widgets_status_enabled")
              : t("integrations_widgets_status_disabled")}
          </span>
        </div>

        {widgetScriptOpen ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-4">
            <p className="mb-2 text-sm font-medium text-foreground">{t("integrations_widgets_script_label")}</p>
            <Textarea
              value={widgetScript}
              onChange={(event) => setWidgetScript(event.target.value)}
              className="min-h-28 font-mono text-xs"
            />
            <p className="mt-2 text-xs text-muted-foreground">{t("integrations_widgets_script_help")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copyWidgetScript}>
                {t("integrations_widgets_copy_script")}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={openWidgetBuilder}>
                {t("integrations_widgets_open_builder")}
              </Button>
            </div>
          </div>
        ) : null}
      </motion.div>
      ) : null}

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 gap-4">
        {visibleIntegrations.map((integration, index) => {
          const lockedByPlan =
            PRO_REQUIRED_INTEGRATION_IDS.has(integration.id) && !hasProAccess
          const config = settingsConfig[integration.id]
          const expanded = activeSettingsId === integration.id
          return (
          <motion.div
            key={integration.id}
            initial={embedded ? false : { opacity: 0, y: 20 }}
            animate={embedded ? undefined : { opacity: 1, y: 0 }}
            transition={embedded ? undefined : { duration: 0.4, delay: index * 0.1 }}
            whileHover={embedded ? undefined : { y: -2 }}
            className={
              embedded
                ? "rounded-2xl border border-border/80 bg-card/50 p-5 transition-all duration-300 hover:bg-card/70"
                : "glass glass-hover rounded-2xl p-5 transition-all duration-300"
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/60 text-foreground">
                  {integration.icon}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    {"nameKey" in integration ? t(integration.nameKey) : integration.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t(integration.descriptionKey)}
                  </p>
                  {lockedByPlan ? (
                    <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      {t("integrations_pro_required")}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={lockedByPlan ? false : connections[integration.id]}
                  disabled={lockedByPlan}
                  onCheckedChange={() => {
                    if (!lockedByPlan) {
                      toggleConnection(integration.id)
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  aria-label={
                    lockedByPlan ? t("integrations_pro_required_aria") : t("nav_settings")
                  }
                  aria-expanded={expanded}
                  onClick={() => {
                    if (lockedByPlan) {
                      openPricing()
                      return
                    }
                    if (!config) return
                    setActiveSettingsId((prev) =>
                      prev === integration.id ? null : integration.id
                    )
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {expanded && config ? (
              <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">{config.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>

                <div className="mt-3 space-y-3">
                  {config.fields.map((field) => (
                    <div key={`${integration.id}-${field.key}`} className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        {field.label}
                      </label>
                      <Input
                        type={field.inputType ?? "text"}
                        value={integrationSettings[integration.id]?.[field.key] ?? ""}
                        onChange={(event) =>
                          updateIntegrationField(
                            integration.id,
                            field.key,
                            event.target.value
                          )
                        }
                        placeholder={field.placeholder}
                      />
                      <p className="text-xs text-muted-foreground">{field.help}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => saveIntegrationSettings(integration.id)}
                  >
                    {lang === "en" ? "Save" : lang === "tg" ? "Нигоҳ доштан" : "Сохранить"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(config.docsUrl, "_blank", "noopener,noreferrer")}
                  >
                    {lang === "en" ? "Open docs" : lang === "tg" ? "Кушодани дастур" : "Открыть инструкцию"}
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
          </motion.div>
          )
        })}
      </div>

      {/* Coming Soon */}
      {studioEmbeddedFootnote}

      {showComingSoonFooter ? (
      <motion.div
        initial={embedded ? false : { opacity: 0, y: 20 }}
        animate={embedded ? undefined : { opacity: 1, y: 0 }}
        transition={embedded ? undefined : { duration: 0.4, delay: 0.5 }}
        className={
          embedded
            ? "mt-6 rounded-2xl border border-border/80 bg-muted/20 p-5 text-center"
            : "glass mt-8 rounded-2xl p-6 text-center"
        }
      >
        <p className="text-muted-foreground">
          {t("integrations_soon")}
        </p>
      </motion.div>
      ) : null}
    </>
  )

  if (embedded) {
    return <div className="min-w-0">{inner}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {inner}
    </motion.div>
  )
}
