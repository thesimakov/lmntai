export type SettingsUiLanguage = "ru" | "en" | "tg";

export type SettingsFieldCopy = {
  label: string;
  description: string;
  options?: string[];
  placeholder?: string;
};

export const settingsNamespace = {
  ru: {
    settingsTitle: "Настройки",
    settingsSubtitle: "Управление настройками приложения",
    common: {
      apply: "Применить",
      applying: "Применяю..."
    },
    groups: {
      notifications: "Уведомления",
      security: "Безопасность",
      localization: "Локализация",
      appearance: "Внешний вид"
    },
    settings: {
      email_notifications: {
        label: "Email уведомления",
        description: "Получать уведомления о завершении генерации"
      },
      marketing_emails: {
        label: "Маркетинговые письма",
        description: "Новости и обновления продукта"
      },
      two_factor: {
        label: "Двухфакторная аутентификация",
        description: "Дополнительный уровень защиты аккаунта"
      },
      session_timeout: {
        label: "Автовыход из системы",
        description: "Через какое время выходить при бездействии",
        options: ["1 час", "4 часа", "24 часа", "Никогда"]
      },
      language: {
        label: "Язык интерфейса",
        description: "Выберите предпочитаемый язык"
      },
      timezone: {
        label: "Часовой пояс",
        description: "Выберите часовой пояс для корректного отображения времени.",
        placeholder: "Выберите…"
      },
      compact_mode: {
        label: "Компактный режим",
        description: "Уменьшенные отступы и размеры элементов"
      },
      animations: {
        label: "Анимации",
        description: "Плавные переходы и эффекты"
      }
    },
    danger: {
      title: "Опасная зона",
      description:
        "Удаление аккаунта приведёт к потере всех данных. Это действие необратимо.",
      deleteAccount: "Удалить аккаунт"
    }
  },
  en: {
    settingsTitle: "Settings",
    settingsSubtitle: "Manage application preferences",
    common: {
      apply: "Apply",
      applying: "Applying..."
    },
    groups: {
      notifications: "Notifications",
      security: "Security",
      localization: "Localization",
      appearance: "Appearance"
    },
    settings: {
      email_notifications: {
        label: "Email notifications",
        description: "Receive alerts when generation completes"
      },
      marketing_emails: {
        label: "Marketing emails",
        description: "Product news and updates"
      },
      two_factor: {
        label: "Two‑factor authentication",
        description: "An extra layer of account security"
      },
      session_timeout: {
        label: "Auto‑logout",
        description: "Sign out after inactivity",
        options: ["1 hour", "4 hours", "24 hours", "Never"]
      },
      language: {
        label: "Interface language",
        description: "Choose your preferred language"
      },
      timezone: {
        label: "Time zone",
        description: "Choose a time zone to display times correctly.",
        placeholder: "Select…"
      },
      compact_mode: {
        label: "Compact mode",
        description: "Reduced spacing and smaller UI elements"
      },
      animations: {
        label: "Animations",
        description: "Smooth transitions and effects"
      }
    },
    danger: {
      title: "Danger zone",
      description:
        "Deleting your account will remove all data. This action cannot be undone.",
      deleteAccount: "Delete account"
    }
  },
  tg: {
    settingsTitle: "Танзимот",
    settingsSubtitle: "Идоракунии танзимоти барнома",
    common: {
      apply: "Татбиқ",
      applying: "Татбиқ мешавад..."
    },
    groups: {
      notifications: "Огоҳиномаҳо",
      security: "Амният",
      localization: "Локализатсия",
      appearance: "Намуд"
    },
    settings: {
      email_notifications: {
        label: "Огоҳиномаҳои email",
        description: "Пас аз анҷоми тавлид огоҳӣ гиред"
      },
      marketing_emails: {
        label: "Мактубҳои маркетингӣ",
        description: "Хабарҳо ва навсозиҳои маҳсулот"
      },
      two_factor: {
        label: "Аутентификатсияи дуқадамӣ",
        description: "Қабати иловагии муҳофизати ҳисоб"
      },
      session_timeout: {
        label: "Баромади худкор",
        description: "Пас аз бефаъолиятӣ кай баромадан",
        options: ["1 соат", "4 соат", "24 соат", "Ҳеҷ гоҳ"]
      },
      language: {
        label: "Забони интерфейс",
        description: "Забони дилхоҳро интихоб кунед"
      },
      timezone: {
        label: "Минтақаи вақт",
        description: "Барои намоиши дурусти вақт минтақаи вақтро интихоб кунед.",
        placeholder: "Интихоб кунед…"
      },
      compact_mode: {
        label: "Ҳолати фишурда",
        description: "Фосилаҳои хурдтар ва унсурҳои кӯчак"
      },
      animations: {
        label: "Аниматсияҳо",
        description: "Гузаришҳо ва эффектҳои ҳамвор"
      }
    },
    danger: {
      title: "Минтақаи хатар",
      description:
        "Ҳазфи ҳисоб боиси аз даст рафтани ҳамаи маълумот мешавад. Ин амал баргардонида намешавад.",
      deleteAccount: "Ҳазфи ҳисоб"
    }
  }
} as const;

export const settingsLanguageLabel: Record<SettingsUiLanguage, string> = {
  ru: "Русский",
  en: "English",
  tg: "Тоҷикӣ"
};

export const settingsRuTimezones: Array<{ id: string; label: string }> = [
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
  { id: "UTC", label: "UTC" }
];

function pad2(n: number) {
  return String(Math.abs(n)).padStart(2, "0");
}

export function offsetMinutesForTimeZone(tz: string, date = new Date()): number | null {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset"
    } as Intl.DateTimeFormatOptions);
    const parts = dtf.formatToParts(date);
    const off = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    const m = off.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (!m) return 0;
    const sign = m[1] === "-" ? -1 : 1;
    const hours = Number(m[2] ?? 0);
    const minutes = Number(m[3] ?? 0);
    return sign * (hours * 60 + minutes);
  } catch {
    return null;
  }
}

export function formatOffset(offsetMinutes: number | null) {
  if (offsetMinutes == null) return "UTC";
  const sign = offsetMinutes < 0 ? "-" : "+";
  const hh = pad2(Math.trunc(offsetMinutes / 60));
  const mm = pad2(offsetMinutes % 60);
  return `UTC${sign}${hh}:${mm}`;
}

export function formatOffsetHoursRu(offsetMinutes: number | null) {
  if (offsetMinutes == null) return "";
  const hours = Math.trunc(offsetMinutes / 60);
  const abs = Math.abs(hours);
  const word =
    abs % 10 === 1 && abs % 100 !== 11
      ? "час"
      : abs % 10 >= 2 && abs % 10 <= 4 && !(abs % 100 >= 12 && abs % 100 <= 14)
        ? "часа"
        : "часов";
  const sign = hours < 0 ? "-" : "+";
  return `${sign}${abs} ${word}`;
}
