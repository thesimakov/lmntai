import { canAccessStaff, type StaffPermission } from "@/lib/staff-permissions";

export type AdminSectionId = "users" | "tariffs" | "promocodes" | "team" | "settings";

export type AdminSectionRule = {
  id: AdminSectionId;
  href: string;
  label: string;
  permission?: StaffPermission;
  superOnly?: boolean;
};

/** Единые правила видимости разделов админки (UI + серверные проверки в страницах). */
export const ADMIN_SECTION_RULES: readonly AdminSectionRule[] = [
  { id: "users", href: "/admin/users", label: "Пользователи", permission: "users.read" },
  { id: "tariffs", href: "/admin/tariffs", label: "Тарифы", permission: "tariffs", superOnly: true },
  {
    id: "promocodes",
    href: "/admin/promocodes",
    label: "Промокоды",
    permission: "tariffs",
    superOnly: true
  },
  { id: "team", href: "/admin/team", label: "Команда", permission: "team", superOnly: true },
  { id: "settings", href: "/admin/settings", label: "Профиль / пароль", permission: "settings" }
];

export function canAccessAdminSection(
  role: string,
  permissions: StaffPermission[] | null | undefined,
  section: AdminSectionRule
) {
  if (!section.permission) {
    return role === "ADMIN" || role === "MANAGER";
  }
  return canAccessStaff(role, permissions, section.permission, Boolean(section.superOnly));
}
