"use client"

import { motion } from "framer-motion"
import { Bell, Shield, Globe, Palette, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/components/i18n-provider"

type UiLanguage = "ru" | "en" | "tg"

type SettingsFieldCopy = {
  label: string
  description: string
  options?: string[]
  placeholder?: string
}

const i18n = {
  ru: {
    settingsTitle: "Настройки",
    settingsSubtitle: "Управление настройками приложения",
    common: {
      apply: "Применить",
      applying: "Применяю...",
    },
    groups: {
      notifications: "Уведомления",
      security: "Безопасность",
      localization: "Локализация",
      appearance: "Внешний вид",
    },
    settings: {
      email_notifications: {
        label: "Email уведомления",
        description: "Получать уведомления о завершении генерации",
      },
      marketing_emails: {
        label: "Маркетинговые письма",
        description: "Новости и обновления продукта",
      },
      two_factor: {
        label: "Двухфакторная аутентификация",
        description: "Дополнительный уровень защиты аккаунта",
      },
      session_timeout: {
        label: "Автовыход из системы",
        description: "Через какое время выходить при бездействии",
        options: ["1 час", "4 часа", "24 часа", "Никогда"],
      },
      language: {
        label: "Язык интерфейса",
        description: "Выберите предпочитаемый язык",
      },
      timezone: {
        label: "Часовой пояс",
        description: "Выберите часовой пояс для корректного отображения времени.",
        placeholder: "Выберите…",
      },
      compact_mode: {
        label: "Компактный режим",
        description: "Уменьшенные отступы и размеры элементов",
      },
      animations: {
        label: "Анимации",
        description: "Плавные переходы и эффекты",
      },
    },
    danger: {
      title: "Опасная зона",
      description:
        "Удаление аккаунта приведёт к потере всех данных. Это действие необратимо.",
      deleteAccount: "Удалить аккаунт",
    },
  },
  en: {
    settingsTitle: "Settings",
    settingsSubtitle: "Manage application preferences",
    common: {
      apply: "Apply",
      applying: "Applying...",
    },
    groups: {
      notifications: "Notifications",
      security: "Security",
      localization: "Localization",
      appearance: "Appearance",
    },
    settings: {
      email_notifications: {
        label: "Email notifications",
        description: "Receive alerts when generation completes",
      },
      marketing_emails: {
        label: "Marketing emails",
        description: "Product news and updates",
      },
      two_factor: {
        label: "Two‑factor authentication",
        description: "An extra layer of account security",
      },
      session_timeout: {
        label: "Auto‑logout",
        description: "Sign out after inactivity",
        options: ["1 hour", "4 hours", "24 hours", "Never"],
      },
      language: {
        label: "Interface language",
        description: "Choose your preferred language",
      },
      timezone: {
        label: "Time zone",
        description: "Choose a time zone to display times correctly.",
        placeholder: "Select…",
      },
      compact_mode: {
        label: "Compact mode",
        description: "Reduced spacing and smaller UI elements",
      },
      animations: {
        label: "Animations",
        description: "Smooth transitions and effects",
      },
    },
    danger: {
      title: "Danger zone",
      description:
        "Deleting your account will remove all data. This action cannot be undone.",
      deleteAccount: "Delete account",
    },
  },
  tg: {
    settingsTitle: "Танзимот",
    settingsSubtitle: "Идоракунии танзимоти барнома",
    common: {
      apply: "Татбиқ",
      applying: "Татбиқ мешавад...",
    },
    groups: {
      notifications: "Огоҳиномаҳо",
      security: "Амният",
      localization: "Локализатсия",
      appearance: "Намуд",
    },
    settings: {
      email_notifications: {
        label: "Огоҳиномаҳои email",
        description: "Пас аз анҷоми тавлид огоҳӣ гиред",
      },
      marketing_emails: {
        label: "Мактубҳои маркетингӣ",
        description: "Хабарҳо ва навсозиҳои маҳсулот",
      },
      two_factor: {
        label: "Аутентификатсияи дуқадамӣ",
        description: "Қабати иловагии муҳофизати ҳисоб",
      },
      session_timeout: {
        label: "Баромади худкор",
        description: "Пас аз бефаъолиятӣ кай баромадан",
        options: ["1 соат", "4 соат", "24 соат", "Ҳеҷ гоҳ"],
      },
      language: {
        label: "Забони интерфейс",
        description: "Забони дилхоҳро интихоб кунед",
      },
      timezone: {
        label: "Минтақаи вақт",
        description: "Барои намоиши дурусти вақт минтақаи вақтро интихоб кунед.",
        placeholder: "Интихоб кунед…",
      },
      compact_mode: {
        label: "Ҳолати фишурда",
        description: "Фосилаҳои хурдтар ва унсурҳои кӯчак",
      },
      animations: {
        label: "Аниматсияҳо",
        description: "Гузаришҳо ва эффектҳои ҳамвор",
      },
    },
    danger: {
      title: "Минтақаи хатар",
      description:
        "Ҳазфи ҳисоб боиси аз даст рафтани ҳамаи маълумот мешавад. Ин амал баргардонида намешавад.",
      deleteAccount: "Ҳазфи ҳисоб",
    },
  },
}

const ruTimezones: Array<{ id: string; label: string }> = [
  { id: "Europe/Moscow", label: "Москва" },
  { id: "Europe/Kaliningrad", label: "Калининград" },
  { id: "Europe/Samara", label: "Самара" },
  { id: "Asia/Yekaterinburg", label: "Екатеринбург" },
  { id: "Asia/Omsk", label: "Омск" },
  { id: "Asia/Novosibirsk", label: "Новосибирск" },
  { id: "Asia/Krasnoyarsk", label: "Красноярск" },
  { id: "Asia/Irkutsk", label: "Иркутск" },
  { id: "Asia/Yakutsk", label: "Якутск" },
  { id: "Asia/Vladivostok", label: "Владивосток" },
  { id: "Asia/Magadan", label: "Магадан" },
  { id: "Asia/Kamchatka", label: "Камчатка" },
  { id: "Europe/London", label: "Лондон" },
  { id: "Europe/Berlin", label: "Берлин" },
  { id: "Europe/Paris", label: "Париж" },
  { id: "Asia/Dubai", label: "Дубай" },
  { id: "Asia/Tokyo", label: "Токио" },
  { id: "Asia/Shanghai", label: "Шанхай" },
  { id: "America/New_York", label: "Нью‑Йорк" },
  { id: "America/Los_Angeles", label: "Лос‑Анджелес" },
  { id: "America/Sao_Paulo", label: "Сан‑Паулу" },
  { id: "UTC", label: "UTC" },
]

const DEFAULT_TZ_IDS = ruTimezones.map((z) => z.id)

function pad2(n: number) {
  return String(Math.abs(n)).padStart(2, "0")
}

function offsetMinutesForTimeZone(tz: string, date = new Date()): number | null {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    } as Intl.DateTimeFormatOptions)
    const parts = dtf.formatToParts(date)
    const off = parts.find((p) => p.type === "timeZoneName")?.value ?? ""
    // e.g. "GMT+3", "GMT+03:00", "GMT-04:00"
    const m = off.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
    if (!m) return 0
    const sign = m[1] === "-" ? -1 : 1
    const hours = Number(m[2] ?? 0)
    const minutes = Number(m[3] ?? 0)
    return sign * (hours * 60 + minutes)
  } catch {
    return null
  }
}

function formatOffset(offsetMinutes: number | null) {
  if (offsetMinutes == null) return "UTC"
  const sign = offsetMinutes < 0 ? "-" : "+"
  const hh = pad2(Math.trunc(offsetMinutes / 60))
  const mm = pad2(offsetMinutes % 60)
  return `UTC${sign}${hh}:${mm}`
}

function formatOffsetHoursRu(offsetMinutes: number | null) {
  if (offsetMinutes == null) return ""
  const hours = Math.trunc(offsetMinutes / 60)
  const abs = Math.abs(hours)
  const word =
    abs % 10 === 1 && abs % 100 !== 11
      ? "час"
      : abs % 10 >= 2 && abs % 10 <= 4 && !(abs % 100 >= 12 && abs % 100 <= 14)
        ? "часа"
        : "часов"
  const sign = hours < 0 ? "-" : "+"
  return `${sign}${abs} ${word}`
}

const settingsGroups = [
  {
    id: "notifications",
    title: "notifications",
    icon: Bell,
    settings: [
      {
        id: "email_notifications",
        type: "switch",
        defaultValue: true,
      },
      {
        id: "marketing_emails",
        type: "switch",
        defaultValue: false,
      },
    ],
  },
  {
    id: "security",
    title: "security",
    icon: Shield,
    settings: [
      {
        id: "two_factor",
        type: "switch",
        defaultValue: false,
      },
      {
        id: "session_timeout",
        type: "select",
        options: [],
        defaultValue: "",
      },
    ],
  },
  {
    id: "localization",
    title: "localization",
    icon: Globe,
    settings: [
      {
        id: "language",
        type: "select",
        options: ["ru", "en", "tg"],
        defaultValue: "ru",
      },
      {
        id: "timezone",
        type: "select",
        // список будет построен динамически (см. ниже)
        options: [],
        defaultValue: "",
      },
    ],
  },
  {
    id: "appearance",
    title: "appearance",
    icon: Palette,
    settings: [
      {
        id: "compact_mode",
        type: "switch",
        defaultValue: false,
      },
      {
        id: "animations",
        type: "switch",
        defaultValue: true,
      },
    ],
  },
]

export function Settings() {
  function normalizeLanguage(value: unknown): UiLanguage | null {
    return value === "ru" || value === "en" || value === "tg" ? value : null
  }

  const { lang, setLang } = useI18n()

  const languageLabel: Record<UiLanguage, string> = {
    ru: "Русский",
    en: "English",
    tg: "Тоҷикӣ",
  }

  const language = lang
  const [pendingLanguage, setPendingLanguage] = useState<UiLanguage>(lang)
  const [isApplyingLanguage, setIsApplyingLanguage] = useState(false)

  useEffect(() => {
    setPendingLanguage(lang)
    setIsApplyingLanguage(false)
  }, [lang])

  /** server + 1st client paint: stable list (no `Intl`/`localStorage` split across Node vs browser) */
  const [isClient, setIsClient] = useState(false)
  const [timezoneOptions, setTimezoneOptions] = useState<string[]>(() => [...DEFAULT_TZ_IDS])
  const [timezone, setTimezone] = useState("")

  useEffect(() => {
    setIsClient(true)
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone
    let fromStorage = ""
    try {
      fromStorage = window.localStorage.getItem("lmnt_timezone") ?? ""
    } catch {
      // ignore
    }
    const set = new Set<string>(DEFAULT_TZ_IDS)
    if (resolved) set.add(resolved)
    if (fromStorage) set.add(fromStorage)
    setTimezoneOptions(Array.from(set))
    const pick = fromStorage || resolved || ""
    if (pick) setTimezone(pick)
  }, [])

  function onTimezoneChange(next: string) {
    setTimezone(next)
    try {
      window.localStorage.setItem("lmnt_timezone", next)
    } catch {
      // ignore
    }
  }

  function onLanguageChange(next: string) {
    const normalized = normalizeLanguage(next)
    if (!normalized) return
    setPendingLanguage(normalized)
  }

  function applyLanguage() {
    if (typeof window === "undefined") return
    if (pendingLanguage === lang) return

    setIsApplyingLanguage(true)
    setLang(pendingLanguage)
    window.location.reload()
  }

  const t = i18n[language]

  const timezoneLabels = useMemo(() => {
    if (!isClient) {
      return timezoneOptions.map((id) => ({ id, label: id }))
    }
    const date = new Date()
    const ruMap = new Map(ruTimezones.map((z) => [z.id, z.label] as const))
    const entries = timezoneOptions.map((tz) => {
      const offsetMin = offsetMinutesForTimeZone(tz, date)
      const timeLocale = language === "ru" ? "ru-RU" : language === "tg" ? "tg-TJ" : "en-US"
      const time = new Intl.DateTimeFormat(timeLocale, {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
      const place = language === "ru" ? ruMap.get(tz) ?? tz : tz
      const offset = formatOffset(offsetMin)
      const hours = formatOffsetHoursRu(offsetMin)
      const meta = hours ? `${offset}, ${hours}` : offset
      return {
        id: tz,
        label: `${place} — ${time} (${meta})`,
      }
    })
    entries.sort((a, b) => a.label.localeCompare(b.label, "ru"))
    return entries
  }, [timezoneOptions, language, isClient])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-2xl"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t.settingsTitle}</h1>
        <p className="mt-1 text-muted-foreground">{t.settingsSubtitle}</p>
      </div>

      {/* Settings Groups */}
      <div className="space-y-6">
        {settingsGroups.map((group, groupIndex) => {
          const Icon = group.icon
          const groupTitle = t.groups[group.id as keyof typeof t.groups] ?? group.title
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: groupIndex * 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/60">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">{groupTitle}</h3>
              </div>

              <div className="space-y-4">
                {group.settings.map((setting) => {
                  const isTimezone = group.id === "localization" && setting.id === "timezone"
                  const isLanguage = group.id === "localization" && setting.id === "language"
                  const settingText = (t.settings as Record<string, SettingsFieldCopy | undefined>)[
                    setting.id
                  ]
                  const selectOptions = isTimezone
                    ? timezoneLabels.map((z) => z.id)
                    : isLanguage
                      ? (setting.options ?? [])
                      : setting.id === "session_timeout"
                        ? (settingText?.options ?? [])
                        : (setting.options ?? [])
                  const selectValue = isTimezone
                    ? timezone
                    : isLanguage
                      ? pendingLanguage
                      : setting.id === "session_timeout"
                        ? ((settingText?.options?.[2] ?? "") as string)
                        : (setting.defaultValue as string)

                  return (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {settingText?.label ?? setting.id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {settingText?.description ?? ""}
                        </p>
                      </div>
                      {setting.type === "switch" ? (
                        <Switch defaultChecked={setting.defaultValue as boolean} />
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          <Select
                            value={selectValue}
                            onValueChange={
                              isTimezone ? onTimezoneChange : isLanguage ? onLanguageChange : undefined
                            }
                          >
                            <SelectTrigger className="w-56">
                              <SelectValue placeholder={t.settings.timezone.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {isTimezone
                                ? timezoneLabels.map((z) => (
                                    <SelectItem key={z.id} value={z.id}>
                                      {z.label}
                                    </SelectItem>
                                  ))
                                : selectOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {isLanguage
                                        ? languageLabel[option as UiLanguage] ?? option
                                        : option}
                                    </SelectItem>
                                  ))}
                            </SelectContent>
                          </Select>

                          {isLanguage ? (
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={
                                isApplyingLanguage || pendingLanguage === language
                              }
                              onClick={applyLanguage}
                              className="rounded-xl"
                            >
                              {isApplyingLanguage ? t.common.applying : t.common.apply}
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
            <Trash2 className="h-4 w-4 text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-foreground">{t.danger.title}</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t.danger.description}</p>
        <Button
          variant="outline"
          className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          {t.danger.deleteAccount}
        </Button>
      </motion.div>
    </motion.div>
  )
}
