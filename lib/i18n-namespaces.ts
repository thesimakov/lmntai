import type { MessageKey, UiLanguage } from "@/lib/i18n";
import { messages } from "@/lib/i18n";

export type I18nNamespace =
  | "auth"
  | "landing"
  | "playground"
  | "pricing"
  | "team"
  | "profile"
  | "projects"
  | "integrations"
  | "nav"
  | "common";

const namespacePrefixes: Record<I18nNamespace, string[]> = {
  auth: ["auth_"],
  landing: ["landing_"],
  playground: ["playground_"],
  pricing: ["pricing_"],
  team: ["team_"],
  profile: ["profile_"],
  projects: ["projects_"],
  integrations: ["integrations_", "integration_"],
  nav: ["nav_", "sidebar_"],
  common: ["common_", "loading", "retry", "cancel", "create", "creating", "logout", "account"]
};

export function getNamespaceMessages(lang: UiLanguage, namespace: I18nNamespace) {
  const dict = messages[lang] as Record<string, string>;
  const prefixes = namespacePrefixes[namespace];
  const out: Partial<Record<MessageKey, string>> = {};
  for (const [key, value] of Object.entries(dict)) {
    if (prefixes.some((prefix) => key.startsWith(prefix) || key === prefix)) {
      out[key as MessageKey] = value;
    }
  }
  return out;
}
