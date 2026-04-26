/**
 * Права сотрудников (роль MANAGER). Полный администратор (ADMIN) имеет все права.
 */
export const STAFF_PERMISSIONS = {
  "users.read": "Просмотр списка пользователей, балансов и планов",
  "users.write": "Создание и редактирование пользователей, пополнение токенов, смена плана / партнёра",
  "users.delete": "Удаление пользователей",
  tariffs: "Просмотр и редактирование лимитов тарифов и флагов функций",
  team: "Управление менеджерами: создание, права, отзыв",
  settings: "Смена собственного пароля в панели",
  stats: "Просмотр агрегированной статистики (расход токенов и т.д.)"
} as const;

export type StaffPermission = keyof typeof STAFF_PERMISSIONS;

export const STAFF_PERMISSION_KEYS = Object.keys(STAFF_PERMISSIONS) as StaffPermission[];

export function isStaffPermission(value: string): value is StaffPermission {
  return value in STAFF_PERMISSIONS;
}

export function parsePermissionList(value: unknown): StaffPermission[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is StaffPermission => typeof v === "string" && isStaffPermission(v));
}

/**
 * @param superOnly — только роль ADMIN (тарифы платформы, команда менеджеров, удаление пользователей).
 */
export function canAccessStaff(
  role: string,
  perms: StaffPermission[] | null | undefined,
  required: StaffPermission,
  superOnly = false
) {
  if (role === "ADMIN") return true;
  if (superOnly) return false;
  if (role !== "MANAGER") return false;
  return Boolean(perms?.includes(required));
}
